import { DEFAULT_LANG, LANGS } from './config.js';

const MESSAGES = {
  pl: {
    method: 'Niedozwolona metoda.',
    origin: 'Niedozwolone źródło żądania.',
    rateLimited: 'Zbyt wiele prób. Spróbuj później.',
    invalid: 'Nieprawidłowe dane formularza.',
    captcha: 'Nie udało się potwierdzić, że formularz wysyła człowiek. Spróbuj ponownie.',
    server: 'Błąd konfiguracji serwera.',
    checkoutFailed: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
    newsletterFailed: 'Nie udało się zapisać do newslettera. Spróbuj później.',
    surveyFailed: 'Nie udało się zapisać. Spróbuj później.',
    contactFailed: 'Nie udało się wysłać wiadomości. Spróbuj później.',
  },
  en: {
    method: 'Method not allowed.',
    origin: 'Request origin not allowed.',
    rateLimited: 'Too many attempts. Try again later.',
    invalid: 'Invalid form data.',
    captcha: 'We could not confirm that a human is sending this form. Try again.',
    server: 'Server configuration error.',
    checkoutFailed: 'Could not start the payment. Try again.',
    newsletterFailed: 'Could not subscribe to the newsletter. Try again later.',
    surveyFailed: 'Could not save your booking. Try again later.',
    contactFailed: 'Could not send the message. Try again later.',
  },
};

export function langOf(req) {
  const fromBody = req.body?.locale ?? req.body?.lang;
  if (LANGS.includes(fromBody)) return fromBody;
  const header = String(req.headers?.['accept-language'] ?? '').toLowerCase();
  return LANGS.find((l) => header.startsWith(l)) ?? DEFAULT_LANG;
}

export function msg(req, key) {
  return MESSAGES[langOf(req)][key] ?? MESSAGES[DEFAULT_LANG][key] ?? key;
}
