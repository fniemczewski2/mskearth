import createDOMPurify from 'dompurify';

const ALLOWED_IMG = /^(?:\/(?!\/)|https:\/\/[a-z0-9-]+\.supabase\.co\/)/i;

let purifier = null;

function getPurifier() {
  if (purifier) return purifier;
  // Prywatna instancja: hook nie wplywa na inne wywolania DOMPurify w aplikacji.
  purifier = createDOMPurify(window);
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (/^https?:/i.test(href) && !/^https:\/\/(www\.)?msk\.earth(\/|$)/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
      }
    }
    // CSP (img-src) i tak zablokuje obrazy z innych hostow, wiec nie renderujemy pustych ramek.
    if (node.tagName === 'IMG' && !ALLOWED_IMG.test(node.getAttribute('src') ?? '')) {
      node.remove();
    }
  });
  return purifier;
}

const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a',
    'blockquote', 'figure', 'figcaption', 'img', 'hr', 'code', 'pre', 'span',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'loading'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/(?!\/))/i,
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'object', 'embed', 'script'],
  FORBID_ATTR: ['style', 'srcset', 'formaction', 'onerror', 'onload'],
};

export function sanitizeArticle(html) {
  return getPurifier().sanitize(html ?? '', CONFIG);
}
