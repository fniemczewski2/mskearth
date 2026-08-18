import DOMPurify from 'dompurify';

/**
 * Sanityzacja tresci redakcyjnej przed dangerouslySetInnerHTML.
 * Domyslna konfiguracja DOMPurify blokuje skrypty, ale przepuszcza
 * <iframe>, <form>, atrybut style i linki bez rel - przy CMS-ie
 * to za malo.
 */

let hookRegistered = false;

function registerHook() {
  if (hookRegistered) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('http')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow ugc');
    }
  });
  hookRegistered = true;
}

const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a',
    'blockquote', 'figure', 'figcaption', 'img', 'hr', 'code', 'pre', 'span',
  ],
  ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'width', 'height', 'loading'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/)/i,
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'object', 'embed', 'script'],
  FORBID_ATTR: ['style', 'srcset', 'formaction', 'onerror', 'onload'],
};

export function sanitizeArticle(html) {
  registerHook();
  return DOMPurify.sanitize(html ?? '', CONFIG);
}
