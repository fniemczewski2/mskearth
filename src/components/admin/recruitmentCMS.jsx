import { useEffect, useState } from "react";
import {
  fetchRecruitmentCalls,
  createRecruitmentCall,
  updateRecruitmentCall,
  deleteRecruitmentCall,
} from "../../services/db/recruitmentCalls.jsx";
import {
  getRecruitmentSettings,
  replaceRecruitmentSettings,
} from "../../services/db/recruitmentSettings.jsx";

import { supabase } from "../../services/supabaseClient.jsx";

const emptyCall = { date: "", time: "", link: "" };
function RecruitmentCallsCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCall);
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
    try { const list = await fetchRecruitmentCalls(); setRows(list); }
    catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  const startCreate = () => { setEditingId(null); setForm(emptyCall); };
  const startEdit = (row) => { setEditingId(row.id); setForm({ date: row.date || "", time: row.time || "", link: row.link || "" }); };
  const cancelEdit = () => { setEditingId(null); setForm(emptyCall); };

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      if (!form.date || !form.time) throw new Error("Podaj datę i godzinę");
      const payload = { date: form.date, time: form.time, link: form.link || null };
      if (editingId) await updateRecruitmentCall(editingId, payload);
      else await createRecruitmentCall(payload);
      await load(); cancelEdit();
    } catch (e) { setErr(e?.message || String(e)); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Usunąć termin rozmowy?")) return;
    setErr("");
    try { await deleteRecruitmentCall(id); await load(); } catch (e) { setErr(e?.message || String(e)); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać terminami rozmów.</p>
      </div>
    );

  return (
    <>
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak terminów.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Data</th>
                  <th className="cms-th">Godzina</th>
                  <th className="cms-th">Link</th>
                  <th className="cms-th" style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">{r.date}</td>
                    <td className="cms-td">{r.time}</td>
                    <td className="cms-td">{r.link ? <a href={r.link} target="_blank" rel="noreferrer">dołącz</a> : "—"}</td>
                    <td className="cms-td">
                      <div className="cms-actions">
                        <button className="cms-btn" onClick={() => startEdit(r)}><i className="bi bi-pencil-fill" aria-hidden="true"></i></button>
                        <button className="cms-btnDanger" onClick={() => handleDelete(r.id)}><i className="bi bi-trash-fill" aria-hidden="true"></i></button>
                      </div>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        )}
      </section>

      <aside className="cms-card">
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>{editingId ? "Edytuj termin" : "Nowy termin"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Data</span>
            <input type="date" className="cms-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Godzina</span>
            <input type="time" className="cms-input" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Link (opcjonalnie)</span>
            <input type="url" placeholder="https://…" className="cms-input" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>Anuluj</button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj termin"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

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
      <RecruitmentCallsCMS />
      <RecruitmentSettingsCMS />
    </div>
  );
}
