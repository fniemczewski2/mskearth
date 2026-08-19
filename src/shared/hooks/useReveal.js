import { useEffect } from 'react';

export default function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]:not([data-revealed])');
    if (nodes.length === 0) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.setAttribute('data-revealed', ''));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-revealed', '');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  });
}
