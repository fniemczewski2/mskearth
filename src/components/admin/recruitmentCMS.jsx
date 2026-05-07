import { useEffect, useState } from "react";
import {
  getRecruitmentSettings,
  replaceRecruitmentSettings,
} from "../../services/db/recruitmentSettings.jsx";

import { supabase } from "../../services/supabaseClient.jsx";

function RecruitmentSettingsCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState({ instagram: "", form: "" });
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
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      await replaceRecruitmentSettings({ instagram: settings.instagram || null, form: settings.form || null });
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
        <form onSubmit={handleSave}>
          <label className="cms-labelWrap">
            <span className="cms-label">Instagram URL</span>
            <input type="url" placeholder="https://instagram.com/..." className="cms-input" value={settings.instagram} onChange={(e) => setSettings((s) => ({ ...s, instagram: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Link do formularza</span>
            <input type="url" placeholder="https://…" className="cms-input" value={settings.form} onChange={(e) => setSettings((s) => ({ ...s, form: e.target.value }))} />
          </label>
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
