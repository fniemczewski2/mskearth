import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Seo from './Seo.jsx';

describe('Seo', () => {
  it('sets the document title and core meta tags', () => {
    render(
      <Seo
        title="Aktualności — MSK"
        description="Najnowsze wiadomości"
        url="https://msk.earth/pl/aktualnosci"
      />
    );

    expect(document.title).toBe('Aktualności — MSK');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Najnowsze wiadomości'
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://msk.earth/pl/aktualnosci'
    );
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Aktualności — MSK'
    );
  });

  it('falls back to the default absolute logo image when none is provided', () => {
    render(<Seo title="Strona główna" />);

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://msk.earth/og-image.png'
    );
  });

  it('keeps an already-absolute image URL untouched', () => {
    render(<Seo title="Artykuł" image="https://cdn.example.com/photo.jpg" />);

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://cdn.example.com/photo.jpg'
    );
  });
});

describe('Seo noindex and alternates', () => {
  it('emits noindex and no canonical for pages that should not be indexed', () => {
    render(<Seo title="404" url="https://msk.earth/pl/x" noindex />);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('adds hreflang alternates for language-prefixed URLs', () => {
    render(<Seo title="Kontakt" url="https://msk.earth/pl/kontakt" />);
    expect(document.querySelector('link[hreflang="en"]')).toHaveAttribute('href', 'https://msk.earth/en/kontakt');
    expect(document.querySelector('link[hreflang="x-default"]')).toHaveAttribute('href', 'https://msk.earth/pl/kontakt');
  });
});
