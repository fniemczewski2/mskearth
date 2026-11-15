// scripts/release.mjs
//
// Wydanie: kontrole (format, lint, testy, audyt zależności, build), podbicie wersji w package.json
// i package-lock.json, podsumowanie, opis commita i - po potwierdzeniu - git commit oraz git push.
// Zestaw kontroli jest ten sam co w CI (.github/workflows/ci.yml).
//
// Użycie:
//   node scripts/release.mjs                    # patch (0.2.0 -> 0.2.1), pyta o potwierdzenie
//   node scripts/release.mjs --minor            # 0.2.0 -> 0.3.0
//   node scripts/release.mjs --major            # 0.2.0 -> 1.0.0
//   node scripts/release.mjs --yes              # bez pytania o potwierdzenie
//   node scripts/release.mjs --dry-run          # tylko kontrole i podsumowanie; bez zmian w plikach, commita i push
//   node scripts/release.mjs --only=lint,test   # wybrane kontrole (do diagnozy; wydanie wymaga wszystkich)

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const args = new Set(process.argv.slice(2));
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const ONLY = onlyArg ? new Set(onlyArg.split(',')) : null;
const ASSUME_YES = args.has('--yes');

// "npm run release --minor" (bez "--") nie przekazuje flagi do skryptu, tylko ustawia zmienną npm_config_minor.
// Te trzy flagi są odczytywane także stamtąd; --yes i --only wymagają zapisu "npm run release -- --yes".
const npmFlag = (name) => process.env[`npm_config_${name}`] === 'true';
const DRY_RUN = args.has('--dry-run') || npmFlag('dry_run');

function bumpKind() {
  if (args.has('--major') || npmFlag('major')) return 'major';
  if (args.has('--minor') || npmFlag('minor')) return 'minor';
  return 'patch';
}
const BUMP = bumpKind();

// Kody kolorów terminala (ESC[...m) usuwane z wyjścia narzędzi.
const ESC = String.fromCodePoint(27);
const ANSI_COLOR = new RegExp(String.raw`${ESC}\[[0-9;]*m`, 'g');

const SECRET_PATTERNS = [
  /(^|\/)\.env(\..*)?$/,
  /\.pem$/,
  /\.key$/,
  /(^|\/)credentials/i,
  /service[-_]account/i,
];
// Wzór zmiennych bez wartości: jedyny plik .env, który wolno commitować.
const SECRET_ALLOWLIST = new Set(['.env.example']);

// Wartości zastępcze jak w CI: build nie łączy się z prawdziwym projektem Supabase.
const BUILD_ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_placeholder',
};

/**
 * Środowisko dla poleceń potomnych bez zmiennych npm_config_*. "npm run" przekazuje w nich własne
 * ustawienia i flagi wywołania, które potomne "npm audit" lub "npm run build" odrzucają albo źle interpretują.
 */
function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const key of Object.keys(env)) {
    if (/^npm_config_/i.test(key)) delete env[key];
  }
  return env;
}

const say = (line = '') => process.stdout.write(`${line}\n`);
const heading = (title) => say(`\n== ${title} ==`);

const run = (command, { cwd, env = {} } = {}) => {
  const started = Date.now();
  const result = spawnSync(command, {
    shell: true,
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: childEnv(env),
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(ANSI_COLOR, '');
  return { code: result.status ?? 1, output, ms: Date.now() - started };
};

/** Wersja asynchroniczna: kontrole są długie, więc co HEARTBEAT_MS wypisywany jest czas trwania. */
const HEARTBEAT_MS = 5000;
const runAsync = (command, { cwd, env = {}, onLine = null, heartbeat = true } = {}) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, { shell: true, cwd, env: childEnv(env) });
    let output = '';
    let pending = '';
    const collect = (chunk) => {
      output += chunk;
      if (!onLine) return;
      // Strumień dzielony na pełne linie (fragment bez końca linii czeka na kolejną porcję).
      const lines = (pending + chunk).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) onLine(line.replace(ANSI_COLOR, ''));
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = heartbeat
      ? setInterval(() => say(`      ... trwa ${Math.round((Date.now() - started) / 1000)} s`), HEARTBEAT_MS)
      : null;
    const finish = (code, text) => {
      if (timer) clearInterval(timer);
      if (onLine && pending) onLine(pending.replace(ANSI_COLOR, ''));
      resolve({ code, output: text.replace(ANSI_COLOR, ''), ms: Date.now() - started });
    };
    child.on('error', (error) => finish(1, String(error)));
    child.on('close', (code) => finish(code ?? 1, output));
  });

const git = (command) => run(`git ${command}`);
const gitOut = (command) => git(command).output.trim();

// ---------------------------------------------------------------- wersja

function bumpVersion(version, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Nieprawidłowa wersja w package.json: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Podmienia wartość pierwszego pola "version" w tekście, zaczynając od pozycji `from`. */
function replaceVersionValue(text, from, nextVersion, label) {
  const pattern = /("version"\s*:\s*")([^"]*)(")/g;
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  if (!match) throw new Error(`${label}: nie znaleziono pola "version"`);
  return (
    text.slice(0, match.index) + match[1] + nextVersion + match[3] + text.slice(match.index + match[0].length)
  );
}

function diffLines(a, b) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  if (aLines.length !== bLines.length) return ['<różna liczba linii>'];
  return aLines.filter((line, i) => line !== bLines[i]);
}

/**
 * Podbija wersję w package.json i package-lock.json. Podmienia wyłącznie wartość pola "version"
 * (bez ponownego formatowania JSON), więc wcięcia, końce linii i kolejność kluczy zostają bez zmian.
 * Zwraca oryginalną treść plików do ewentualnego przywrócenia.
 */
function applyVersion(nextVersion) {
  const updates = new Map();
  const originals = new Map();

  const pkgOriginal = readFileSync('package.json', 'utf8');
  originals.set('package.json', pkgOriginal);
  updates.set('package.json', replaceVersionValue(pkgOriginal, 0, nextVersion, 'package.json'));

  const lockOriginal = readFileSync('package-lock.json', 'utf8');
  originals.set('package-lock.json', lockOriginal);
  const rootDone = replaceVersionValue(lockOriginal, 0, nextVersion, 'package-lock.json (wersja główna)');
  const emptyPkg = rootDone.indexOf('"": {');
  if (emptyPkg === -1) throw new Error('package-lock.json: brak wpisu packages[""]');
  updates.set(
    'package-lock.json',
    replaceVersionValue(rootDone, emptyPkg, nextVersion, 'package-lock.json (packages[""])')
  );

  // Kontrola: wynik to poprawny JSON z nową wersją, a zmieniły się tylko linie z polem "version".
  const lock = JSON.parse(updates.get('package-lock.json'));
  if (lock.version !== nextVersion || lock.packages?.['']?.version !== nextVersion) {
    throw new Error('package-lock.json: wersje po podbiciu się nie zgadzają - przerywam');
  }
  for (const [file, text] of updates) {
    if (JSON.parse(text).version !== nextVersion) {
      throw new Error(`${file}: wersja po podbiciu się nie zgadza - przerywam`);
    }
    if (diffLines(originals.get(file), text).some((line) => !line.includes('"version"'))) {
      throw new Error(`${file}: podbicie zmieniłoby więcej niż wersję - przerywam`);
    }
  }

  for (const [file, text] of updates) writeFileSync(file, text);
  return originals;
}

function restore(originals) {
  for (const [file, text] of originals) writeFileSync(file, text);
}

// ---------------------------------------------------------------- postęp testów

const TEST_TOTAL_FILE = '.git/RELEASE_TEST_TOTAL';
const TEST_PROGRESS_INTERVAL_MS = 2000;
// Linia wyniku jednego testu w reporterze verbose: "✓ plik > opis 12ms" (× = nieudany, ↓ = pominięty).
const TEST_RESULT_LINE = /^\s*(✓|×|↓)\s+\S.*\s>\s/;

/**
 * Łączna liczba testów do wykonania. Źródło: liczba z poprzedniego udanego wydania (dokładna, dopóki
 * zestaw się nie zmieni), a bez niej `vitest list` (zaniża wynik dla testów parametryzowanych).
 */
function readTestTotalEstimate() {
  if (existsSync(TEST_TOTAL_FILE)) {
    const saved = Number(readFileSync(TEST_TOTAL_FILE, 'utf8').trim());
    if (Number.isInteger(saved) && saved > 0) return { total: saved, source: 'z poprzedniego wydania' };
  }
  const listed = run('npx vitest list')
    .output.split('\n')
    .filter((line) => line.includes(' > ')).length;
  return { total: listed, source: 'vitest list' };
}

/** Licznik na żywo: wykonane, nieudane i pozostałe testy, wypisywany najwyżej co TEST_PROGRESS_INTERVAL_MS. */
function createTestProgress(total) {
  let done = 0;
  let failed = 0;
  let lastPrint = 0;
  const print = () => {
    const left = done > total ? 'nieznane (więcej niż szacowano)' : `~${total - done}`;
    const of = done > total ? '' : `/${total}`;
    say(`      testy: wykonano ${done}${of}, pozostało ${left}, nieudanych ${failed}`);
    lastPrint = Date.now();
  };
  return {
    onLine(line) {
      const match = TEST_RESULT_LINE.exec(line);
      if (!match) return;
      done += 1;
      if (match[1] === '×') failed += 1;
      if (Date.now() - lastPrint >= TEST_PROGRESS_INTERVAL_MS) print();
    },
    finish: print,
  };
}

// ---------------------------------------------------------------- kontrole

const tail = (text, length = 1500) => text.slice(-length);

const checks = [
  {
    name: 'format',
    label: 'format (prettier)',
    run: async () => {
      // W trybie dry-run pliki nie są zmieniane, więc formatowanie jest tylko sprawdzane.
      if (!DRY_RUN) await runAsync('npx prettier --write .');
      const r = await runAsync('npx prettier --check .');
      const warned = r.output.split('\n').filter((l) => l.startsWith('[warn]') && !l.includes('Code style'));
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? 'zgodny z regułami' : `${warned.length} plik(ów) do sformatowania`,
        ms: r.ms,
        detail: warned.slice(0, 10).join('\n'),
      };
    },
  },
  {
    name: 'lint',
    label: 'lint (eslint)',
    run: async () => {
      const r = await runAsync('npm run lint --silent');
      const found = /(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/.exec(r.output);
      const problems = found ? `${found[3]} ostrzeżeń, ${found[2]} błędów` : 'błąd uruchomienia';
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? 'bez błędów i ostrzeżeń' : problems,
        ms: r.ms,
        detail: r.code === 0 ? '' : tail(r.output),
      };
    },
  },
  {
    name: 'test',
    label: 'testy (vitest)',
    run: async () => {
      const estimate = readTestTotalEstimate();
      say(`      łącznie testów (${estimate.source}): ~${estimate.total}`);
      const progress = createTestProgress(estimate.total);
      const r = await runAsync('npx vitest run --reporter=verbose', {
        onLine: (line) => progress.onLine(line),
        heartbeat: false,
      });
      progress.finish();
      const tests = /Tests\s+(?:(\d+) failed \| )?(\d+) passed(?: \| (\d+) skipped)?(?: \((\d+)\))?/.exec(
        r.output
      );
      const files = /Test Files\s+(?:(\d+) failed \| )?(\d+) passed/.exec(r.output);
      const failed = Number(tests?.[1] ?? 0);
      const ok = r.code === 0 && failed === 0 && Boolean(tests);
      if (ok && tests?.[4]) writeFileSync(TEST_TOTAL_FILE, `${Number(tests[4])}\n`);
      return {
        ok,
        summary: tests
          ? `${tests[2]} testów przeszło (${failed} nieudanych), ${files?.[2] ?? '?'} plików`
          : 'brak wyniku',
        ms: r.ms,
        detail: ok
          ? ''
          : r.output
              .split('\n')
              .filter((l) => /FAIL|×|AssertionError/.test(l))
              .slice(0, 15)
              .join('\n'),
      };
    },
  },
  {
    name: 'audit',
    label: 'audyt zależności (npm audit)',
    run: async () => {
      const r = await runAsync('npm audit --audit-level=high');
      const found = /(\d+) vulnerabilit(?:y|ies) \(([^)]*)\)/.exec(r.output);
      const clean = /found 0 vulnerabilities/.test(r.output);
      const npmError = /npm error (?!A complete log)(.*)/.exec(r.output)?.[1];
      const listed = found
        ? `${found[1]} podatności (${found[2]})`
        : `npm audit nie zadziałał: ${npmError ?? 'brak wyniku'}`;
      return {
        ok: r.code === 0,
        summary: clean ? 'brak podatności' : listed,
        ms: r.ms,
        detail: r.code === 0 ? '' : tail(r.output),
      };
    },
  },
  {
    name: 'build',
    label: 'build (vite build + sitemap)',
    run: async () => {
      const r = await runAsync('npm run build', { env: BUILD_ENV });
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? 'zbudowano' : 'build nieudany',
        ms: r.ms,
        detail: r.code === 0 ? '' : tail(r.output, 2000),
      };
    },
  },
];

// ---------------------------------------------------------------- git

function assertRepository() {
  if (gitOut('rev-parse --is-inside-work-tree') !== 'true') throw new Error('To nie jest repozytorium git.');
  const branch = gitOut('branch --show-current');
  if (!branch)
    throw new Error('HEAD nie wskazuje na gałąź (detached). Przełącz się na gałąź przed wydaniem.');
  return branch;
}

function changedFiles() {
  return (
    git('status --porcelain=v1 -uall')
      .output.split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3))
      // Zmiana nazwy ma postać "stara -> nowa": liczy się nowa ścieżka.
      .map((path) => path.split(' -> ').pop().replace(/^"|"$/g, ''))
  );
}

function findSecretLikeFiles(files) {
  return files.filter(
    (file) => !SECRET_ALLOWLIST.has(file) && SECRET_PATTERNS.some((pattern) => pattern.test(file))
  );
}

function stagedFiles() {
  return gitOut('diff --cached --name-only').split('\n').filter(Boolean);
}

function stagedAddedFiles() {
  return gitOut('diff --cached --name-status')
    .split('\n')
    .filter((line) => line.startsWith('A'))
    .map((line) => line.split('\t')[1]);
}

// ---------------------------------------------------------------- opis commita

function groupByArea(files) {
  const groups = new Map();
  for (const file of files) {
    const area = file.includes('/') ? file.split('/')[0] : '(główny katalog)';
    groups.set(area, [...(groups.get(area) ?? []), file]);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Odmiana rzeczownika przez liczbę: 1 plik, 2-4 pliki, 5+ plików. */
function plural(count, one, few, many) {
  if (count === 1) return one;
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

function fileList(list) {
  const shown = list.slice(0, 4).join(', ');
  return list.length > 4 ? `${shown}, ...` : shown;
}

/** Czynności, których wdrożenie na Vercelu nie wykona samo. */
function deploymentNotes(added, files) {
  const notes = [];
  const migrations = added.filter((f) => f.startsWith('supabase/migrations/')).map((f) => f.split('/').pop());
  if (migrations.length) {
    notes.push(`migracje SQL do wykonania przed wdrożeniem (npx supabase db push): ${migrations.join(', ')}`);
  }
  if (files.includes('.env.example')) {
    notes.push('zmienił się .env.example: sprawdź zmienne środowiskowe w Vercelu');
  }
  if (files.includes('vercel.json')) {
    notes.push('zmienił się vercel.json: po wdrożeniu sprawdź przekierowania, nagłówki CSP i cron');
  }
  if (files.some((f) => f.startsWith('public/locales/'))) {
    notes.push('zmieniły się tłumaczenia: jeśli doszła ikona bi-*, uruchom npm run icons');
  }
  return notes;
}

function buildCommitMessage({ version, files, checkResults }) {
  const areas = groupByArea(files).map(
    ([area, list]) =>
      `- ${area}: ${list.length} ${plural(list.length, 'plik', 'pliki', 'plików')} (${fileList(list)})`
  );
  const notes = deploymentNotes(stagedAddedFiles(), files);
  const lines = [`Ver ${version}`, '', 'Zmiany:', ...areas];
  if (notes.length) lines.push('', 'Wdrożenie:', ...notes.map((note) => `- ${note}`));
  lines.push('', 'Kontrole:', ...checkResults.map((r) => `- ${r.label}: ${r.summary}`));
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- główna część

const indent = (text) =>
  text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

async function runChecks() {
  const results = [];
  for (const [index, check] of checks.entries()) {
    const step = `[${index + 1}/${checks.length}]`;
    if (ONLY && !ONLY.has(check.name)) {
      results.push({ ...check, skipped: true, ok: false, summary: 'pominięto (--only)', ms: 0 });
      say(`${step} ${check.label}: pominięto (--only)`);
      continue;
    }
    say(`${step} ${check.label} ... start`);
    // Kontrole działają kolejno: współdzielą pliki i pamięć podręczną.
    const r = await check.run();
    results.push({ ...check, ...r });
    say(`${step} ${check.label}: ${r.ok ? 'OK' : 'BŁĄD'}, ${r.summary} (${(r.ms / 1000).toFixed(1)} s)`);
    if (!r.ok && r.detail) say(indent(r.detail));
  }
  return results;
}

function statusMark(result) {
  if (result.skipped) return 'POMINIĘTO';
  return result.ok ? 'OK' : 'BŁĄD';
}

function printSummary(results, version, files) {
  heading('Podsumowanie kontroli');
  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    const seconds = (r.ms / 1000).toFixed(1).padStart(6);
    say(`${statusMark(r).padEnd(9)} ${r.label.padEnd(width)}  ${seconds} s  ${r.summary}`);
  }
  heading('Wersja');
  const noun = plural(files.length, 'zmieniony plik', 'zmienione pliki', 'zmienionych plików');
  say(`${version}  (${files.length} ${noun})`);
}

/** Zatrzymuje wydanie: przywraca wersję (jeśli została podbita), wypisuje komunikat i ustawia kod wyjścia. */
function stop(originals, message, exitCode = 1) {
  if (originals) restore(originals);
  say(message);
  process.exitCode = exitCode;
}

/** Pytanie tak/nie. Ctrl+C, zamknięcie wejścia i każda odpowiedź inna niż "t"/"tak"/"y"/"yes" oznaczają "nie". */
function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(value);
    };
    rl.on('SIGINT', () => finish(false));
    rl.on('close', () => finish(false));
    rl.question(question).then(
      (answer) => finish(['t', 'tak', 'y', 'yes'].includes(answer.trim().toLowerCase())),
      () => finish(false)
    );
  });
}

async function commitAndPush({ branch, originals, results, version }) {
  say('\nCommit: dodawanie zmian (git add -A) ...');
  git('add -A');
  const message = buildCommitMessage({
    version,
    files: stagedFiles(),
    checkResults: results.filter((r) => !r.skipped).map((r) => ({ label: r.label, summary: r.summary })),
  });
  heading('Opis commita');
  say(message);

  if (!ASSUME_YES && !(await confirm('Zatwierdzić commit i push? [t/N] '))) {
    git('reset -q');
    restore(originals);
    say('Anulowano. Wersja przywrócona, nic nie zostało zacommitowane.');
    return;
  }

  const messageFile = '.git/RELEASE_COMMIT_MSG';
  writeFileSync(messageFile, message);
  say('Commit: git commit ...');
  const commit = git(`commit -F ${messageFile}`);
  if (commit.code !== 0) throw new Error(`git commit nie powiódł się:\n${commit.output}`);
  say(`\nZacommitowano: ${message.split('\n')[0]}`);

  say('Push: git push ...');
  const hasUpstream = git('rev-parse --abbrev-ref --symbolic-full-name @{u}').code === 0;
  const push = git(hasUpstream ? 'push' : `push -u origin ${branch}`);
  if (push.code !== 0) throw new Error(`git push nie powiódł się (commit zostaje lokalnie):\n${push.output}`);
  say(`Wypchnięto na origin/${branch}.`);
}

async function main() {
  const branch = assertRepository();
  const files = changedFiles();
  if (files.length === 0) throw new Error('Brak zmian do wydania.');

  const secrets = findSecretLikeFiles(files);
  if (secrets.length)
    throw new Error(`Zmienione pliki wyglądają na sekrety - nie wydaję: ${secrets.join(', ')}`);

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const nextVersion = bumpVersion(pkg.version, BUMP);
  const mode = DRY_RUN ? 'dry-run' : 'wydanie';
  say(`Gałąź: ${branch}   Wersja: ${pkg.version} -> ${nextVersion} (${BUMP})   Tryb: ${mode}`);

  heading('Kontrole');
  say(
    DRY_RUN
      ? 'Podbicie wersji: pominięte (dry-run)'
      : `Podbicie wersji w package.json i package-lock.json -> ${nextVersion}`
  );
  const originals = DRY_RUN ? null : applyVersion(nextVersion);
  // Ctrl+C w trakcie kontroli lub przy pytaniu o potwierdzenie: wersja wraca, nic nie zostaje w poczekalni.
  process.once('SIGINT', () => {
    if (originals) {
      restore(originals);
      git('reset -q');
    }
    say('\nPrzerwano. Wersja przywrócona, nic nie zostało zacommitowane.');
    process.exit(130);
  });
  const results = await runChecks();
  printSummary(results, nextVersion, files);

  const failed = results.filter((r) => !r.skipped && !r.ok);
  if (failed.length) {
    const names = failed.map((f) => f.label).join(', ');
    return stop(originals, `\nZatrzymano: ${names}. Wersja przywrócona, nic nie zostało zacommitowane.`);
  }
  if (results.some((r) => r.skipped)) {
    return stop(
      originals,
      '\nUwaga: --only pomija kontrole. Wydanie wymaga pełnego zestawu - wersja przywrócona.'
    );
  }
  if (DRY_RUN) {
    return stop(originals, '\nDry-run: wszystkie kontrole przeszły. Pliki nie zostały zmienione.', 0);
  }
  await commitAndPush({ branch, originals, results, version: nextVersion });
}

try {
  await main();
} catch (error) {
  process.stderr.write(`\nBłąd: ${error.message}\n`);
  process.exitCode = 1;
}
