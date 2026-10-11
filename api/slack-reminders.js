// api/slack-reminders.js

export const config = { maxDuration: 60 };

const OPEN_STATUS_VALUES = new Set(['OptHLOTJ6CC', 'OptNYET7N6L', 'OptHERGQPA4']);

async function slackApi(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.error}`);
  return data;
}

function extractText(element) {
  if (Array.isArray(element)) return element.map(extractText).join('');
  if (element && typeof element === 'object') {
    if (typeof element.text === 'string') return element.text;
    for (const key of ['elements', 'rich_text']) {
      if (key in element) return extractText(element[key]);
    }
  }
  return '';
}

async function getAllListItems(listId) {
  const items = [];
  let cursor;
  do {
    const data = await slackApi('slackLists.items.list', {
      list_id: listId,
      include_list: false,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...(data.items || []));
    cursor = data.response_metadata?.next_cursor;
  } while (cursor);
  return items;
}

function groupTasksByUser(items) {
  const tasksByUser = {};

  for (const rec of items) {
    let isOpen = false;
    let taskName = 'Zadanie bez nazwy';
    let assignees = [];

    for (const field of rec.fields || []) {
      switch (field.column_id) {
        case STATUS_COL: {
          const selected = field.select || [];
          isOpen = selected.length > 0 && OPEN_STATUS_VALUES.has(selected[0]);
          break;
        }
        case ASSIGNEE_COL:
          assignees = field.user || [];
          break;
        case TITLE_COL:
          taskName = field.text || extractText(field.rich_text || []) || taskName;
          break;
      }
    }

    if (isOpen) {
      for (const userId of assignees) {
        (tasksByUser[userId] ||= []).push(taskName);
      }
    }
  }
  return tasksByUser;
}

async function sendReminders(tasksByUser) {
  const results = [];

  for (const [userId, tasks] of Object.entries(tasksByUser)) {
    try {
      const main = await slackApi('chat.postMessage', {
        channel: userId,
        text: `Cześć! 👋 Przypominam o zadaniach na agendzie (<${LIST_URL}|zobacz>). Szczegóły znajdziesz w wątku tej wiadomości 👇`,
      });

      const threadText =
        'Twoje bieżące zadania (Do zrobienia, W trakcie lub Zawieszone):\n\n' +
        tasks.map((t) => `• ${t}`).join('\n');

      await slackApi('chat.postMessage', {
        channel: userId,
        text: threadText,
        thread_ts: main.ts,
      });

      results.push({ userId, tasks: tasks.length, ok: true });
    } catch (err) {
      console.error(`Błąd wysyłki do ${userId}:`, err.message);
      results.push({ userId, ok: false, error: err.message });
    }
  }
  return results;
}

function isoWeekWarsaw(date = new Date()) {
  const [y, m, d] = date
    .toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' })
    .split('-')
    .map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    return res.status(500).json({ error: 'SLACK_BOT_TOKEN not set' });
  }
  const force = req.query?.force === '1';
  const week = isoWeekWarsaw();
  if (!force && week % 2 !== 0) {
    return res.status(200).json({ skipped: true, reason: `odd ISO week (${week})` });
  }

  try {
    const items = await getAllListItems(LIST_ID);
    const tasksByUser = groupTasksByUser(items);

    if (Object.keys(tasksByUser).length === 0) {
      return res.status(200).json({ sent: 0, message: 'Brak otwartych zadań dla przypisanych użytkowników.' });
    }

    const results = await sendReminders(tasksByUser);
    const failed = results.filter((r) => !r.ok).length;
    return res.status(failed ? 207 : 200).json({ week, sent: results.length - failed, failed, results });
  } catch (err) {
    console.error('Slack reminders error:', err);
    return res.status(500).json({ error: err.message });
  }
}