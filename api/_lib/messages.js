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
    stripeNotConfigured: 'Płatności online są chwilowo niedostępne.',
    unavailable: 'Usługa jest chwilowo niedostępna. Spróbuj później.',
    forbidden: 'Brak uprawnień.',
    financeFailed: 'Nie udało się pobrać danych ze Stripe.',
    cancelFailed: 'Nie udało się anulować wpłaty.',
    portalInvalid: 'Nieprawidłowy link.',
    portalNotRecurring: 'Ten link nie dotyczy wpłaty cyklicznej.',
    portalExpired: 'Ten link już wygasł. Wejdź na stronę zarządzania wpłatą cykliczną.',
    portalFailed: 'Zarządzanie wpłatą jest chwilowo niedostępne. Napisz do nas, a anulujemy ją ręcznie.',
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
    stripeNotConfigured: 'Online payments are temporarily unavailable.',
    unavailable: 'The service is temporarily unavailable. Try again later.',
    forbidden: 'Not allowed.',
    financeFailed: 'Could not load data from Stripe.',
    cancelFailed: 'Could not cancel the donation.',
    portalInvalid: 'Invalid link.',
    portalNotRecurring: 'This link does not belong to a recurring donation.',
    portalExpired: 'This link has expired. Open the recurring donation management page.',
    portalFailed:
      'Managing the donation is temporarily unavailable. Write to us and we will cancel it manually.',
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
