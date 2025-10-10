// getToken.js
import fetch from 'node-fetch';

const isSandbox = (process.env.PAYU_ENV || 'sandbox').toLowerCase() === 'sandbox';
const PAYU_AUTH_URL = isSandbox
  ? 'https://secure.snd.payu.com/pl/standard/user/oauth/token'
  : 'https://secure.payu.com/pl/standard/user/oauth/token';

function basicAuthHeader(id, secret) {
  const token = Buffer.from(`${id}:${secret}`).toString('base64');
  return `Basic ${token}`;
}

export async function getPayUToken() {
  const { PAYU_CLIENT_ID, PAYU_CLIENT_SECRET } = process.env;
  if (!PAYU_CLIENT_ID || !PAYU_CLIENT_SECRET) {
    throw new Error('Brak PAYU_CLIENT_ID / PAYU_CLIENT_SECRET w .env');
  }

  console.log('Token URL:', PAYU_AUTH_URL); // DEBUG

  const res = await fetch(PAYU_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': basicAuthHeader(PAYU_CLIENT_ID, PAYU_CLIENT_SECRET),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  const text = await res.text();
  if (!res.ok) {
    // Jeżeli tu trafi HTML, od razu to zobaczysz w logach.
    throw new Error(`PayU token error (${res.status}): ${text.slice(0,400)}...`);
  }

  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Niepoprawny JSON tokena: ${text.slice(0,400)}...`); }

  const token = data?.access_token;
  if (!token) throw new Error(`Brak access_token w odpowiedzi PayU: ${text.slice(0,400)}...`);

  return token;
}
