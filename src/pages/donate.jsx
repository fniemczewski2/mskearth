import { useEffect, useRef, useState } from "react";
import "../style/donate.css";
import "../style/joinUs.css";

const CAMPAIGN_URL = "https://nowe.platnosci.ngo.pl/pl/public/campaign/5n7wgG";
const SCRIPT_SRC   = "https://nowe.platnosci.ngo.pl/campaign.js";

export default function WplacamDonate() {
  const hostRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  // put the container in the DOM (before script loads)
  const mountContainer = () => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = ""; // reset
    const div = document.createElement("div");
    div.className = "wplacam-container";
    div.setAttribute("data-url", CAMPAIGN_URL);
    host.appendChild(div);
  };

  // load script once; if already present, wait for it to finish
  const loadScriptOnce = () =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("script error")), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => { s.dataset.loaded = "1"; resolve(); };
      s.onerror = () => reject(new Error("script error"));
      document.head.appendChild(s);
    });

  useEffect(() => {
    let cancelled = false;
    mountContainer();

    (async () => {
      try {
        await loadScriptOnce();

        // wait up to 3s for the widget (iframe) to appear
        const start = performance.now();
        const waitForIframe = () =>
          new Promise((res) => {
            const check = () => {
              if (cancelled) return res(false);
              if (hostRef.current?.querySelector("iframe")) return res(true);
              if (performance.now() - start > 3000) return res(false);
              requestAnimationFrame(check);
            };
            check();
          });

        const ok = await waitForIframe();
        if (!ok && !cancelled) setFallback(true);
      } catch {
        if (!cancelled) setFallback(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <h2>Wesprzyj nas</h2>

      <aside className="donate">
        {/* host for the widget */}
        {!fallback && <div ref={hostRef} className="donate-widget__host" />}

        {/* guaranteed fallback if script didn’t hydrate */}
        {fallback && (
          <iframe
            src={CAMPAIGN_URL}
            title="Wpłacam — darowizna"
            className="donate-widget__iframe"
            style={{ width: "100%", height: "100%", minHeight: 540, border: 0, borderRadius: 8 }}
          />
        )}
      </aside>
    </>
  );
}
