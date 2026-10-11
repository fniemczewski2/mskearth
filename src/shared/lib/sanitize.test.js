import { describe, expect, it } from 'vitest';

import { sanitizeArticle } from './sanitize.js';

describe('sanitizeArticle', () => {
  it('returns an empty string for nullish input', () => {
    expect(sanitizeArticle(null)).toBe('');
    expect(sanitizeArticle(undefined)).toBe('');
  });

  it('keeps allowed formatting tags', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeArticle(html)).toBe(html);
  });

  it('strips script tags and their contents', () => {
    const result = sanitizeArticle('<p>Hi</p><script>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('strips inline event handler attributes', () => {
    const result = sanitizeArticle('<img src="x.jpg" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('strips disallowed elements such as iframe and form', () => {
    const result = sanitizeArticle('<iframe src="https://evil.example"></iframe><form></form>');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<form');
  });

  it('rejects javascript: URLs on links', () => {
    const result = sanitizeArticle('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('forces safe target/rel on external links', () => {
    const result = sanitizeArticle('<a href="https://example.com">link</a>');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer nofollow ugc"');
  });

  it('keeps relative and mailto links untouched', () => {
    const result = sanitizeArticle('<a href="/aktualnosci">tu</a>');
    expect(result).toContain('href="/aktualnosci"');
    expect(result).not.toContain('target="_blank"');
  });
});

describe('sanitizeArticle hosts', () => {
  it('drops images from hosts blocked by the CSP', () => {
    const result = sanitizeArticle('<p>x</p><img src="https://evil.example/a.jpg" alt="a">');
    expect(result).not.toContain('<img');
  });

  it('keeps images from Supabase storage and same-origin paths', () => {
    expect(sanitizeArticle('<img src="https://abc.supabase.co/storage/v1/x.jpg" alt="a">')).toContain('<img');
    expect(sanitizeArticle('<img src="/photo.webp" alt="a">')).toContain('<img');
  });

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeArticle('<a href="//evil.example">x</a>')).not.toContain('evil.example');
  });

  it('does not open own-domain links in a new tab', () => {
    expect(sanitizeArticle('<a href="https://msk.earth/pl">x</a>')).not.toContain('target=');
  });
});
