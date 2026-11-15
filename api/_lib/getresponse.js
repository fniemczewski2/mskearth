import { NAME_MAX_LENGTH } from '../../src/shared/config/site.js';
import { UPSTREAM_TIMEOUT_MS } from './config.js';

const DEFAULT_API_URL = 'https://api.getresponse.com/v3';
const ALREADY_SUBSCRIBED = 409;

/**
 * Dodaje adres do listy GetResponse (API v3, POST /contacts).
 * Adres juz obecny na liscie (HTTP 409) jest traktowany jak udany zapis.
 * Potwierdzenie zapisu (double opt-in) ustawia sie w GetResponse przy liscie, nie tutaj.
 * Rzuca bledem, gdy konfiguracja jest niepelna albo GetResponse odpowie innym bledem.
 */
export async function subscribeToNewsletter(email, { name } = {}) {
  const apiKey = process.env.GETRESPONSE_API_KEY;
  const listId = process.env.GETRESPONSE_LIST_ID;
  if (!apiKey || !listId) {
    const err = new Error('Brak GETRESPONSE_API_KEY lub GETRESPONSE_LIST_ID.');
    err.code = 'getresponse_config';
    throw err;
  }

  const contact = { email, campaign: { campaignId: listId } };
  const cleanName = String(name ?? '')
    .trim()
    .slice(0, NAME_MAX_LENGTH);
  if (cleanName) contact.name = cleanName;

  // GETRESPONSE_API_URL jest potrzebny tylko dla kont GetResponse MAX (inny adres API).
  const res = await fetch(`${process.env.GETRESPONSE_API_URL ?? DEFAULT_API_URL}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': `api-key ${apiKey}` },
    body: JSON.stringify(contact),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (res.ok || res.status === ALREADY_SUBSCRIBED) return;

  const err = new Error(`GetResponse HTTP ${res.status}`);
  err.code = `getresponse_${res.status}`;
  throw err;
}
