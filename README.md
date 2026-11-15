# msk.earth

Serwis Młodzieżowego Strajku Klimatycznego: aktualności, mapa miast, dane fundacji, zbiórka i newsletter.

React 19 + Vite, Supabase (baza, auth, storage), funkcje serverless na Vercelu (Stripe, newsletter GetResponse, formularz kontaktowy przez Gmail API, zapisy na ankiety).

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

Serwis działa wyłącznie na kluczach produkcyjnych Stripe (identyfikatory sesji `cs_live_`), więc potwierdzenia wpłaty i portalu nie da się przejść kluczem testowym.

## Skrypty

| Polecenie | Działanie |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (strona główna + strony osadzeń) |
| `npm run preview` | podgląd builda |
| `npm run lint` | ESLint, zero tolerancji dla ostrzeżeń |
| `npm test` | testy Vitest (uruchamiane też w CI) |
| `npm run format` | formatowanie Prettier (`format:check` działa w CI) |
| `npm run release` | wydanie: kontrole jak w CI, podbicie wersji, commit i push (opis niżej) |
| `npm run release:dry` | same kontrole, bez zmian w plikach, commita i push |
| `npm run icons` | przebudowa podzbioru ikon (wymaga Pythona: `pip install fonttools brotli`) |

## Wydanie

`npm run release` (`scripts/release.mjs`) wykonuje kolejno: formatowanie, lint, testy, `npm audit` i build, czyli ten sam zestaw co CI. Gdy wszystko przejdzie, podbija wersję w `package.json` i `package-lock.json`, pokazuje opis commita i po potwierdzeniu robi `git add -A`, `git commit` oraz `git push`. Przy błędzie którejkolwiek kontroli wersja wraca do poprzedniej i nic nie jest commitowane.

```bash
npm run release              # patch: 0.2.0 -> 0.2.1
npm run release -- --minor   # 0.2.0 -> 0.3.0
npm run release -- --major   # 0.2.0 -> 1.0.0
npm run release -- --yes     # bez pytania o potwierdzenie
npm run release -- --only=lint,test   # wybrane kontrole do diagnozy; wydania nie wykona
```

Flagi `--minor`, `--major` i `--dry-run` działają też bez `--` (`npm run release --minor`); `--yes` i `--only` wymagają zapisu z `--`.

Skrypt commituje wszystkie zmiany w katalogu roboczym, także nieśledzone pliki. Odmawia wydania, gdy wśród zmian są pliki wyglądające na sekrety (`.env*` poza `.env.example`, `*.pem`, `*.key`).

## Zmienne środowiskowe

Do bundla trafiają i są **publiczne** zmienne z prefiksem `VITE_` oraz `SUPABASE_URL` i `SUPABASE_PUBLISHABLE_KEY` (`envPrefix` w `vite.config.js`). Sekrety (`SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `GETRESPONSE_API_KEY`) ustawia się wyłącznie w Vercel → Settings → Environment Variables i nigdy nie dostają prefiksu `VITE_`.

Pełna lista w `.env.example`.

| Zmienna | Do czego |
|---|---|
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4. Skrypt ładuje się dopiero po zgodzie w banerze cookies. Puste = brak analityki, baner jest samą informacją. |
| `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile w formularzach. Klucz witryny jest publiczny, sekret zostaje na serwerze (`api/_lib/captcha.js`). Bez pary kluczy captcha jest wyłączona. Żeby chronić też logowanie do panelu, włącz Turnstile w Supabase (Authentication → Attack Protection) z tym samym sekretem. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Wysyłka formularza kontaktowego przez Gmail API (zakres `gmail.send`) z konta, dla którego wystawiono token. |
| `VITE_STRIPE_PORTAL_LOGIN_URL` | Opcjonalny link logowania do portalu klienta Stripe (tylko adresy `https://billing.stripe.com`). Pokazywany na stronie `/subskrypcja`; bez niego strona podaje adres e-mail fundacji. |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Opcjonalna konfiguracja portalu (`bpc_...`); pusta = domyślna z panelu Stripe. |
| `CONTACT_RECIPIENT` | Adresat wiadomości z formularza kontaktowego. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Limit zapytań wspólny dla wszystkich instancji funkcji. Bez nich limit działa tylko w pamięci jednej instancji. |
| `CRON_SECRET` i `SLACK_*` | Przypomnienia Slack (`api/slack-reminders.js`, cron w `vercel.json`: poniedziałki 10:00 UTC, co drugi tydzień). |

Sitemapa generowana po buildzie (`scripts/generate-sitemap.mjs`) potrzebuje tylko `SUPABASE_URL` i `SUPABASE_PUBLISHABLE_KEY` (starsze nazwy `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` i `SUPABASE_ANON_KEY` też działają). Bez nich artykuły nie trafią do sitemapy.

Kanoniczny host to `https://msk.earth`; `www.msk.earth` przekierowuje na niego (`vercel.json`).

### Płatności bez webhooka

Serwis nie ma endpointu webhooka ani zmiennej `STRIPE_WEBHOOK_SECRET`. Po płatności Stripe przekierowuje na `/dziekujemy?session_id=...` (wpłata cykliczna: dodatkowo `&typ=cykliczna`). Strona podziękowania wywołuje `api/checkout-confirm`, a serwer pobiera stan sesji ze Stripe, zapisuje wpłatę w tabeli `donations` i zapisuje darczyńcę do GetResponse, jeśli zaznaczył newsletter (`GETRESPONSE_API_KEY`, `GETRESPONSE_LIST_ID`).

Skutki braku webhooka:

- wpłata jest księgowana w bazie tylko wtedy, gdy darczyńca wróci na stronę podziękowania; jeśli zamknie kartę wcześniej, wiersz zostaje ze statusem `pending` (pieniądze są w Stripe);
- kolejne miesięczne pobrania wpłat cyklicznych nie trafiają do tabeli `donations`; ich stan pokazuje panel `/admin/finanse` prosto ze Stripe;
- pasek zbiórki (`donation_stats`) liczy tylko wpłaty zaksięgowane w bazie.

Wpłata cykliczna: przycisk „Zarządzaj wpłatą cykliczną" na stronie podziękowania (`api/stripe-portal`) działa 24 godziny od utworzenia sesji i ma limit 10 prób na godzinę z adresu IP. Limit wymaga Upstash Redis: bez niego endpoint odpowiada 503 (fail-closed). To samo dotyczy `api/finance`.

Panel `/admin/finanse` (tylko administratorzy, `api/finance`): saldo Stripe (dostępne i w rozliczaniu), suma miesięczna wpłat cyklicznych, lista wpłat aktywnych i z nieudaną płatnością, wyszukiwanie i anulowanie z potwierdzeniem. Anulowanie zapisuje wpis w tabeli `security_events` (migracja `20261115120000_security_events.sql`).

## Baza danych

Schemat i polityki RLS powinny być wersjonowane w `supabase/migrations/`.

> **Uwaga:** w repozytorium jest tylko migracja `20261114120000_audit_atomic_writes.sql`. Pozostałego schematu (tabele, RLS, funkcje `is_admin`, `book_survey_slots`, `get_survey_public`, hook domen Google) tu nie ma. Zrzuć go (`npx supabase db pull`) i dodaj do repo. Sprawdź przy tym, czy kolumny `phone` i `email` w `local_contact_people` nie są czytelne dla roli `anon`.

Migracja `20261114120000_audit_atomic_writes.sql` dodaje funkcje `add_survey_window` i `record_donation_session` (zapisy w jednej transakcji) oraz limity typu i rozmiaru plików w buckecie `mskearth`. Kod działa także przed jej wdrożeniem (ścieżki zgodne wstecz).

```bash
npx supabase link --project-ref <id-projektu>
npx supabase db push
```

Po migracji trzeba ręcznie wpisać administratorów - bez tego nikt nie wejdzie do panelu:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email in ('adres@fpmsk.org.pl')
on conflict (user_id) do nothing;
```

### Logowanie do panelu przez Google

Panel (`/admin`) ma przycisk „Zaloguj przez Google”. Przez Google wejdą tylko konta z domen **@msk.earth** i **@fpmsk.org.pl** - sprawdza to przeglądarka (`src/features/admin/allowedDomains.js`) i serwer (hook Supabase `public.hook_admin_google_domains`). Każde konto Google z tych domen **automatycznie dostaje uprawnienia administratora** - trigger w bazie dopisuje je do tabeli `admins` przy pierwszym logowaniu przez Google. Konta logujące się hasłem nadal trzeba dopisać ręcznie. Gdy ktoś odchodzi z organizacji, wyłącz jego konto w Google Workspace i usuń wiersz z `admins`.

Jednorazowa konfiguracja:

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* (typ *Web application*).
   - Authorized JavaScript origins: `https://msk.earth`, `http://localhost:5173`
   - Authorized redirect URIs: `https://<id-projektu>.supabase.co/auth/v1/callback`
   - Jeśli obie domeny są w jednym Google Workspace, ekran zgody można ustawić na *Internal*.
2. **Supabase** → Authentication → Providers → **Google**: włącz i wklej Client ID oraz Client Secret.
3. **Supabase** → Authentication → URL Configuration → *Redirect URLs*: dodaj `https://msk.earth/admin` i `http://localhost:5173/admin` (albo adres z `VITE_AUTH_CALLBACK_URL`). Bez tego wpisu Supabase odsyła po logowaniu na stronę główną (*Site URL*); aplikacja przekierowuje wtedy do `/admin`, ale tylko gdy *Site URL* wskazuje tę samą domenę.
4. Wdróż migrację (`npx supabase db push`), a potem **Supabase** → Authentication → **Hooks** → *Before User Created* → Postgres → `public.hook_admin_google_domains` → włącz.
5. Nic więcej: osoby z @msk.earth i @fpmsk.org.pl po pierwszym logowaniu przez Google mają dostęp do panelu. Konto Google z tym samym adresem co istniejące konto e-mail Supabase łączy automatycznie.

Zasady, na których stoi model dostępu:

- Tabela `donations` jest niedostępna dla przeglądarki. Zapisuje do niej wyłącznie serwer kluczem `service_role`. Statystyki zbiórki czyta się z widoku `donation_stats`, który zwraca trzy liczby zamiast wierszy z danymi darczyńców.
- Panel administracyjny sprawdza funkcję `is_admin()`. Sama sesja nie wystarcza.
- Treści publiczne filtrują polityki RLS (`accepted = true and published is not null`), nie tylko zapytanie w kliencie.

### Ankiety rezerwacji terminów

W panelu (`/admin` → zakładka **Ankiety**) tworzysz ankietę: tytuł, liczba miejsc w jednym slocie, maksymalna liczba slotów na osobę i terminy dostępności (np. wtorek 12:00-16:00). Dla każdego terminu wybierasz, czy zapis dotyczy **całego slotu**, czy **krótszego fragmentu** (np. co 60 min, wtedy okno dzieli się na sloty). Po utworzeniu panel pokazuje publiczny adres `https://msk.earth/pl/ankieta/<slug>` (slug jest losowy, 16 znaków). Strony nie ma w menu, stopce ani w `sitemap.xml`, ma `noindex` i nagłówek `X-Robots-Tag`.

- Tabele ankiet mają RLS: czytają i zmieniają je tylko administratorzy (`is_admin()`).
- Strona publiczna czyta dane przez funkcję `get_survey_public` (liczniki wolnych miejsc, bez adresów e-mail).
- Zapis idzie przez `POST /api/survey-book` (zod, limit 10 prób/h z IP, honeypot, Cloudflare Turnstile, wymagana zgoda RODO), który wywołuje funkcję `book_survey_slots` kluczem `service_role`. Funkcja blokuje wiersze slotów, więc limit miejsc, limit slotów na osobę i brak dubli (ten sam e-mail na ten sam slot) są egzekwowane atomowo. Pełny slot znika dla kolejnych osób.
- Przy każdym zapisie zapisywane są data zgody i wersja treści zgody (`SURVEY_CONSENT_VERSION` w `api/_lib/config.js`). Zmieniając treść zgody w `public/locales/*.json`, zwiększ wersję.
- W panelu można podejrzeć zapisy, usunąć zapis, zamknąć ankietę i pobrać zapisy jako CSV. Usunięcie ankiety kasuje też wszystkie zapisy (dane osobowe). Pamiętaj o usuwaniu starych ankiet zgodnie z polityką prywatności.

## Struktura

```
api/              funkcje serverless + wspólne moduły w _lib/
  create-checkout-session                   utworzenie płatności (Stripe Checkout)
  checkout-confirm                          zaksięgowanie wpłaty po powrocie ze Stripe
  stripe-portal                             zarządzanie wpłatą cykliczną (portal klienta Stripe)
  finance                                   panel finansów dla administratorów
  newsletter-subscribe                      zapis do GetResponse
  contact                                   formularz kontaktowy (Gmail API)
  survey-book                               zapis na terminy ankiety
  page-meta                                 tytuł, opis i Open Graph dla robotów bez JavaScriptu
  slack-reminders                           przypomnienia o zadaniach (cron)
embed/            strony osadzeń dla partnerów
src/app/          punkt wejścia, routing (App.jsx, RootRouter.jsx)
src/features/     jeden folder na widok/funkcję; zapytania do bazy w podfolderach db/
src/layout/       nagłówek, stopka, pasek boczny
src/shared/       komponenty, hooki, i18n, lib i config używane w wielu features
src/services/     klient Supabase i upload plików
src/style/        index.css importuje pliki z parts/ (kolejność ma znaczenie), icons.css jest generowany
                  embed/ zawiera osobne arkusze stron osadzeń (nie ładują index.css)
supabase/         migracje bazy
404.html          statyczna strona błędu zwracana z kodem 404
```

Stałe (adresy, języki, limity kwot i długości pól, rozmiary stron list) są w `src/shared/config/site.js`; limity zapytań i ustawienia serwera w `api/_lib/config.js`.

## Jak działają wybrane mechanizmy

- **Dane z bazy:** widoki publiczne pobierają dane hookiem `useQuery` (`src/shared/hooks/useQuery.js`). Wynik jest trzymany w pamięci przez 60 s i współdzielony po kluczu, więc kilka komponentów z tym samym kluczem wysyła jedno zapytanie.
- **Roboty i podglądy linków:** `vercel.json` kieruje żądania z User-Agent robotów na `api/page-meta`, które zwraca HTML z tytułem, opisem i obrazem danej strony lub artykułu. Ludzie dostają aplikację React.
- **Błąd 404:** `vercel.json` przepisuje na aplikację tylko znane ścieżki. Pozostałe adresy dostają `404.html` z kodem 404. Nową stronę trzeba dopisać w `App.jsx`, w `rewrites` w `vercel.json` i w `PUBLIC_PATHS` (`site.js`).
- **Formularze:** każdy formularz ma walidację zod po stronie serwera, limit zapytań, pole-pułapkę i Cloudflare Turnstile. Żądania z obcych domen (nagłówek `Origin`) są odrzucane.
- **Cookies i analityka:** wybór zapisuje się w `localStorage` (`msk-cookie-consent`). Link „Ustawienia cookies” w stopce otwiera baner ponownie.
- **Ikony:** `src/style/icons.css` i `public/fonts/msk-icons.woff2` zawierają tylko ikony znalezione w kodzie i tłumaczeniach. Po użyciu nowej klasy `bi-*` uruchom `npm run icons`.

## Osadzenia u partnerów

```html
<iframe src="https://msk.earth/embed/donate" title="Wesprzyj MSK"></iframe>
<iframe src="https://msk.earth/embed/belka" title="Wesprzyj MSK"></iframe>
```

Stare adresy `/donate-iframe.html` i `/donate-belka.html` działają dalej: `cleanUrls` najpierw przekierowuje je na `/donate-iframe` i `/donate-belka`, a te są przepisywane na `/embed/*` w `vercel.json` (reguły rewrite muszą więc mieć źródła **bez** `.html`).

Strony osadzeń mają własne CSP z `frame-ancestors 'self' https:` - można je osadzić na dowolnej stronie HTTPS (także w Google Sites, które opakowuje ramki w `*.googleusercontent.com`). Reszta serwisu nadal może być osadzana tylko przez domeny wymienione w głównej regule CSP.

## Tłumaczenia

Teksty leżą w `public/locales/{pl,en}.json` i są ładowane w locie przez hook `useTranslations`. Dodając klucz, dopisz go do obu plików - brakujące wartości mają fallbacki w kodzie, ale wtedy interfejs miesza języki.
