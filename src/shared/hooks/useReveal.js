import { useEffect } from 'react';

const SELECTOR = '[data-reveal]:not([data-revealed])';

/**
 * Animuje wejscie elementow z atrybutem data-reveal. Obserwuje tez elementy
 * dodane pozniej (np. po pobraniu danych), wiec tresc nie zostaje ukryta.
 */
export default function useReveal() {
  useEffect(() => {
    const reveal = (node) => node.setAttribute('data-revealed', '');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce || typeof IntersectionObserver === 'undefined') {
      const revealAll = () => document.querySelectorAll(SELECTOR).forEach(reveal);
      revealAll();
      if (typeof MutationObserver === 'undefined') return undefined;
      const mo = new MutationObserver(revealAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    const observeNew = () => document.querySelectorAll(SELECTOR).forEach((n) => io.observe(n));
    observeNew();

    const mo = new MutationObserver(observeNew);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}
