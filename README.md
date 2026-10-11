# msk.earth

Serwis Młodzieżowego Strajku Klimatycznego: aktualności, mapa miast, dane fundacji, zbiórka i newsletter.

React 19 + Vite, Supabase (baza, auth, storage), Stripe przez funkcje serverless na Vercelu.

## Uruchomienie lokalne

```bash
npm ci
cp .env.example .env.local     # uzupełnij wartości
npm run dev
```

Funkcje z katalogu `api/` nie działają pod `vite dev`. Żeby przetestować płatności lokalnie:

```bash
npx vercel dev --listen 3001   # w drugim terminalu; Vite proxuje /api na ten port
```

Webhook Stripe w developmencie:

```bash
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

## Skrypty

| Polecenie | Działanie |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (strona główna + strony osadzeń) |
| `npm run preview` | podgląd builda |
| `npm run lint` | ESLint, zero tolerancji dla ostrzeżeń |
| `npm test` | testy Vitest (uruchamiane też w CI) |

## Zmienne środowiskowe

Wszystko z prefiksem `VITE_` **trafia do bundla i jest publiczne**. Sekrety (`SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `KIT_API_KEY`) ustawia się wyłącznie w Vercel → Settings → Environment Variables i nigdy nie dostają prefiksu `VITE_`.

Pełna lista w `.env.example`.

Sitemapa generowana po buildzie (`scripts/generate-sitemap.mjs`) potrzebuje tylko klucza **anon** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` albo `SUPABASE_URL` + `SUPABASE_ANON_KEY`). Bez nich artykuły nie trafią do sitemapy.

Kanoniczny host to `https://msk.earth`; `www.msk.earth` przekierowuje na niego (`vercel.json`).

Darczyńcy, którzy zaznaczą newsletter, są zapisywani do Kit przez webhook Stripe po zaksięgowaniu płatności (`KIT_API_KEY`, `KIT_FORM_ID`). W Stripe włącz zdarzenia `checkout.session.completed`, `checkout.session.async_payment_succeeded` i `checkout.session.async_payment_failed` (BLIK, Przelewy24).

## Baza danych

Schemat i polityki RLS powinny być wersjonowane w `supabase/migrations/`.

> **Uwaga:** na gałęzi `refactor2` katalogu `supabase/migrations/` nie ma. Zrzuć aktualny schemat (`npx supabase db pull`) i dodaj go do repo, zanim zaczniesz polegać na poniższych zasadach. Sprawdź przy tym, czy kolumny `phone` i `email` w `local_contact_people` nie są czytelne dla roli `anon`.

```bash
npx supabase link --project-ref <id-projektu>
npx supabase db push
```

Po migracji trzeba ręcznie wpisać administratorów — bez tego nikt nie wejdzie do panelu:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email in ('adres@fpmsk.org.pl')
on conflict (user_id) do nothing;
```

Zasady, na których stoi model dostępu:

- Tabela `donations` jest niedostępna dla przeglądarki. Zapisuje do niej wyłącznie serwer kluczem `service_role`. Statystyki zbiórki czyta się z widoku `donation_stats`, który zwraca trzy liczby zamiast wierszy z danymi darczyńców.
- Panel administracyjny sprawdza funkcję `is_admin()`. Sama sesja nie wystarcza.
- Treści publiczne filtrują polityki RLS (`accepted = true and published is not null`), nie tylko zapytanie w kliencie.

## Struktura

```
api/              funkcje serverless (Stripe, newsletter) + wspólne moduły w _lib/
embed/            strony osadzeń dla partnerów
src/app/          punkt wejścia, routing (App.jsx, RootRouter.jsx)
src/features/     jeden folder na widok/funkcję (news, donate, admin/cms, ...)
src/layout/       nagłówek, stopka, pasek boczny — wspólne dla całej strony
src/shared/       komponenty, hooki, i18n i lib używane w wielu features
src/services/     klient Supabase i upload plików
supabase/         migracje bazy
```

## Osadzenia u partnerów

```html
<iframe src="https://msk.earth/embed/donate" title="Wesprzyj MSK"></iframe>
<iframe src="https://msk.earth/embed/belka" title="Wesprzyj MSK"></iframe>
```

Stare adresy `/donate-iframe.html` i `/donate-belka.html` są przekierowywane w `vercel.json`, więc już osadzone ramki działają dalej. Domeny, które mogą osadzać serwis, kontroluje dyrektywa `frame-ancestors` w tym samym pliku.

## Tłumaczenia

Teksty leżą w `public/locales/{pl,en}.json` i są ładowane w locie przez hook `useTranslations`. Dodając klucz, dopisz go do obu plików — brakujące wartości mają fallbacki w kodzie, ale wtedy interfejs miesza języki.
