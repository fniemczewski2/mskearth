import { describe, expect, it } from 'vitest';

import { DEFAULT_LANG, SUPPORTED_LANGS, langFromPath } from './useTranslations.js';

describe('langFromPath', () => {
  it('extracts a supported language from the first path segment', () => {
    expect(langFromPath('/en/aktualnosci')).toBe('en');
    expect(langFromPath('/pl/o-nas')).toBe('pl');
  });

  it('falls back to the default language for unsupported segments', () => {
    expect(langFromPath('/de/news')).toBe(DEFAULT_LANG);
    expect(langFromPath('/ua/news')).toBe(DEFAULT_LANG);
    expect(langFromPath('/')).toBe(DEFAULT_LANG);
    expect(langFromPath('')).toBe(DEFAULT_LANG);
  });

  it('is case-insensitive', () => {
    expect(langFromPath('/EN/aktualnosci')).toBe('en');
  });

  it('only inspects the first path segment', () => {
    expect(langFromPath('/pl/en')).toBe('pl');
  });
});

describe('SUPPORTED_LANGS', () => {
  it('contains exactly the languages that have locale files', () => {
    expect([...SUPPORTED_LANGS].sort()).toEqual(['en', 'pl']);
  });
});
