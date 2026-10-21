// Czysta logika slotow: bez zaleznosci od React/Supabase, dzieki czemu latwo ja testowac.

export const MAX_SLOTS_PER_WINDOW = 100;

export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''));
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

export function fromMinutes(total) {
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Zamienia okno dostepnosci na sloty.
 * slotMinutes = null/0 -> jeden slot na cale okno; inaczej fragmenty o tej dlugosci
 * (niepelny fragment na koncu okna jest pomijany).
 * Zwraca { slots, error } - error to kod do pokazania adminowi.
 */
export function generateSlots({ date, start, end, slotMinutes }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return { slots: [], error: 'date' };
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (Number.isNaN(from) || Number.isNaN(to)) return { slots: [], error: 'time' };
  if (to <= from) return { slots: [], error: 'range' };

  const step = Number(slotMinutes) > 0 ? Number(slotMinutes) : to - from;
  if (!Number.isInteger(step) || step < 5) return { slots: [], error: 'length' };
  if (step > to - from) return { slots: [], error: 'length' };

  const slots = [];
  for (let t = from; t + step <= to; t += step) {
    slots.push({ slot_date: date, start_time: fromMinutes(t), end_time: fromMinutes(t + step) });
    if (slots.length > MAX_SLOTS_PER_WINDOW) return { slots: [], error: 'tooMany' };
  }
  return { slots, error: null };
}

export function groupByDate(slots) {
  const map = new Map();
  for (const s of slots) {
    const key = s.date ?? s.slot_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      slots: items.sort((x, y) => (x.start ?? x.start_time).localeCompare(y.start ?? y.start_time)),
    }));
}

export function isSelectable(slot, { selected, max }) {
  if (slot.past || slot.free <= 0) return false;
  return selected.has(slot.id) || selected.size < max;
}

export function formatDay(date, lang = 'pl') {
  const [y, m, d] = date.split('-').map(Number);
  // Poludnie UTC, zeby strefa czasowa przegladarki nie przesunela dnia.
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function surveyUrl(origin, lang, slug) {
  return `${origin}/${lang}/ankieta/${slug}`;
}
