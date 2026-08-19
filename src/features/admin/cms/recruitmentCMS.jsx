import { useEffect, useState } from "react";
import {
  getRecruitmentSettings,
  replaceRecruitmentSettings,
} from "../../recruitment/db/recruitmentSettings.jsx";
import { DEFAULT_RECRUITMENT_STEPS } from "../../recruitment/recruitmentDefaults.js";

import { supabase } from "../../../services/supabaseClient.js";

const emptyStep = { text: "", link: "", linkLabel: "" };

function RecruitmentSettingsCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState({ instagram: "", form: "" });
  const [steps, setSteps] = useState(DEFAULT_RECRUITMENT_STEPS);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return; if (error) console.error(error);
      setUser(data?.session?.user ?? null); setSessionChecked(true);
    }
    initAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const s = await getRecruitmentSettings();
      setSettings({ instagram: s?.instagram || "", form: s?.form || "" });
      setSteps(Array.isArray(s?.steps) && s.steps.length > 0 ? s.steps : DEFAULT_RECRUITMENT_STEPS);
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  function updateStep(index, patch) {
    setSteps((list) => list.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }
  function addStep() {
    setSteps((list) => [...list, { ...emptyStep }]);
  }
  function removeStep(index) {
    setSteps((list) => list.filter((_, i) => i !== index));
  }
  function moveStep(index, direction) {
    setSteps((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const cleanSteps = steps
        .map((s) => ({ text: (s.text || "").trim(), link: (s.link || "").trim(), linkLabel: (s.linkLabel || "").trim() }))
        .filter((s) => s.text);
      await replaceRecruitmentSettings({
        instagram: settings.instagram || null,
        form: settings.form || null,
        steps: cleanSteps,
      });
      await load();
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setSaving(false); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać ustawieniami rekrutacji.</p>
      </div>
    );

  return (
    <div className="cms-sectionGrid">
      <aside className="cms-card">
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>Zmień ustawienia</h3>
        <form onSubmit={handleSave} aria-busy={loading ? "true" : "false"}>
          {loading && <div role="status" aria-live="polite" className="cms-helperXs">Wczytywanie ustawień…</div>}
          <label className="cms-labelWrap">
            <span className="cms-label">Instagram URL</span>
            <input type="url" placeholder="https://instagram.com/..." className="cms-input" value={settings.instagram} onChange={(e) => setSettings((s) => ({ ...s, instagram: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Link do formularza</span>
            <input type="url" placeholder="https://…" className="cms-input" value={settings.form} onChange={(e) => setSettings((s) => ({ ...s, form: e.target.value }))} />
          </label>

          <div className="cms-labelWrap">
            <span className="cms-label">Kroki rekrutacji (wyświetlane na stronie głównej)</span>
            <div className="cms-stepsList">
              {steps.map((step, i) => (
                <div className="cms-stepRow" key={i}>
                  <div className="cms-stepRowHead">
                    <span className="cms-stepIndex">{i + 1}</span>
                    <div className="cms-stepRowActions">
                      <button type="button" className="cms-btn" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Przesuń w górę">
                        <i className="bi bi-arrow-up" aria-hidden="true"></i>
                      </button>
                      <button type="button" className="cms-btn" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Przesuń w dół">
                        <i className="bi bi-arrow-down" aria-hidden="true"></i>
                      </button>
                      <button type="button" className="cms-btnDanger" onClick={() => removeStep(i)} aria-label="Usuń krok">
                        <i className="bi bi-trash-fill" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="cms-textarea"
                    placeholder="Opis kroku, np. Zaobserwuj @msk_dolacz na Instagramie"
                    value={step.text}
                    onChange={(e) => updateStep(i, { text: e.target.value })}
                  />
                  <div className="cms-grid2">
                    <input
                      type="url"
                      className="cms-input"
                      placeholder="Link (opcjonalnie)"
                      value={step.link}
                      onChange={(e) => updateStep(i, { link: e.target.value })}
                    />
                    <input
                      type="text"
                      className="cms-input"
                      placeholder="Etykieta przycisku, np. Obserwuj"
                      value={step.linkLabel}
                      onChange={(e) => updateStep(i, { linkLabel: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="cms-btn" onClick={addStep} style={{ marginTop: 12 }}>
              <i className="bi bi-plus-lg" aria-hidden="true"></i>&nbsp;Dodaj krok
            </button>
          </div>

          {err && <div className="cms-error">{err}</div>}
          <div className="cms-formActions">
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : "Zapisz"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default function RecruitmentCMS() {
  return (
    <div className="cms-page">
      <RecruitmentSettingsCMS />
    </div>
  );
}
