const KIT_API = 'https://api.kit.com/v4';

/**
 * Zapisuje adres do formularza Kit (v4): najpierw tworzy (lub aktualizuje) subskrybenta,
 * potem dodaje go do formularza. Rzuca bledem, gdy konfiguracja jest niepelna albo Kit odpowie bledem.
 */
export async function subscribeToKit(email) {
  const apiKey = process.env.KIT_API_KEY;
  const formId = process.env.KIT_FORM_ID;
  if (!apiKey || !formId) {
    const err = new Error('Brak KIT_API_KEY lub KIT_FORM_ID.');
    err.code = 'kit_config';
    throw err;
  }

  const headers = { 'Content-Type': 'application/json', 'X-Kit-Api-Key': apiKey };

  const create = await fetch(`${KIT_API}/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_address: email }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!create.ok) {
    const err = new Error(`Kit create subscriber HTTP ${create.status}`);
    err.code = `kit_${create.status}`;
    throw err;
  }

  const add = await fetch(`${KIT_API}/forms/${encodeURIComponent(formId)}/subscribers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_address: email }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!add.ok) {
    const err = new Error(`Kit add to form HTTP ${add.status}`);
    err.code = `kit_${add.status}`;
    throw err;
  }
}
