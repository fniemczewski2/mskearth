import { UPSTREAM_TIMEOUT_MS } from './config.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const oneLine = (value) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(oneLine(value), 'utf8').toString('base64')}?=`;

function configError(message) {
  const err = new Error(message);
  err.code = 'gmail_config';
  return err;
}

async function accessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw configError('Brak GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET lub GOOGLE_REFRESH_TOKEN.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`Google OAuth HTTP ${res.status}`);
    err.code = `gmail_oauth_${res.status}`;
    throw err;
  }
  return (await res.json()).access_token;
}

/**
 * Wysyla wiadomosc tekstowa przez Gmail API (zakres gmail.send) z konta,
 * dla ktorego wystawiono GOOGLE_REFRESH_TOKEN. Naglowki sa czyszczone ze znakow nowej linii.
 */
export async function sendMail({ to, replyTo, subject, text }) {
  if (!to) throw configError('Brak CONTACT_RECIPIENT.');

  const mime = [
    `To: ${oneLine(to)}`,
    replyTo ? `Reply-To: ${oneLine(replyTo)}` : null,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(text ?? ''), 'utf8').toString('base64'),
  ]
    .filter((line) => line !== null)
    .join('\r\n');

  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = new Error(`Gmail send HTTP ${res.status}`);
    err.code = `gmail_${res.status}`;
    throw err;
  }
}
