const LANGS = [
  { code: 'pl', short: 'PL', name: 'Polski' },
  { code: 'en', short: 'EN', name: 'English' },
];

export default function LanguageSwitch({ lang, onChange, label = 'Wybór języka' }) {
  return (
    <span className="flags" role="group" aria-label={label}>
      {LANGS.filter((l) => l.code !== lang).map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className="flag-btn"
          lang={l.code}
          title={l.name}
          aria-label={`${l.short} – ${l.name}`}
        >
          {l.short}
        </button>
      ))}
    </span>
  );
}
