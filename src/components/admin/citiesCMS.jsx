// --- CitiesCMS.jsx (no Tailwind) ---
import { useEffect, useState } from "react";
import {
  fetchCities,
  createCity,
  updateCity,
  deleteCity,
} from "../../services/db/cities.jsx";

import { supabase } from "../../services/supabaseClient.jsx";

const emptyCity = { name: "", facebook: "", instagram: "", meetings: "", voivodeship: "" };

export function CitiesCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error(error);
      setUser(data?.session?.user ?? null);
      setSessionChecked(true);
    }
    initAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await fetchCities();
      setRows(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionChecked && user) load();
  }, [sessionChecked, user]);

  const startCreate = () => { setEditingId(null); setForm(emptyCity); };
  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      facebook: row.facebook || "",
      instagram: row.instagram || "",
      meetings: row.meetings || "",
      voivodeship: row.voivodeship || "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyCity); };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      if (editingId) await updateCity(editingId, form);
      else await createCity(form);
      await load();
      cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Usunąć to miasto?")) return;
    setErr("");
    try { await deleteCity(id); await load(); } catch (e) { setErr(e?.message || String(e)); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać miastami.</p>
      </div>
    );

  return (
    <>
      <section className="cms-section">
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak miast.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Województwo</th>
                  <th className="cms-th">Nazwa</th>
                  <th className="cms-th">Facebook</th>
                  <th className="cms-th">Instagram</th>
                  <th className="cms-th">Spotkania</th>
                  <th className="cms-th" style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">{r.voivodeship || "—"}</td>
                    <td className="cms-td" style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="cms-td">{r.facebook ? <a href={r.facebook} target="_blank" rel="noreferrer">link</a> : "—"}</td>
                    <td className="cms-td">{r.instagram ? <a href={r.instagram} target="_blank" rel="noreferrer">link</a> : "—"}</td>
                    <td className="cms-td">{r.meetings || "—"}</td>
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
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>{editingId ? "Edytuj miasto" : "Nowe miasto"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Nazwa</span>
            <input className="cms-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Województwo</span>
            <input className="cms-input" value={form.voivodeship} onChange={(e) => setForm((f) => ({ ...f, voivodeship: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Facebook (URL)</span>
            <input className="cms-input" value={form.facebook} onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Instagram (URL)</span>
            <input className="cms-input" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Spotkania (opis)</span>
            <textarea className="cms-textarea" value={form.meetings} onChange={(e) => setForm((f) => ({ ...f, meetings: e.target.value }))} />
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>Anuluj</button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj miasto"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

// --- LocalContactsCMS.jsx (no Tailwind) ---
import {
  fetchLocalContacts,
  createLocalContact,
  updateLocalContact,
  deleteLocalContact,
} from "../../services/db/localContacts.jsx";

export function LocalContactsCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", facebook: "", phone: "", email: "", city: "" });
  const [saving, setSaving] = useState(false);

  const [cities, setCities] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error(error);
      setUser(data?.session?.user ?? null);
      setSessionChecked(true);
    }
    initAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [list, cs] = await Promise.all([fetchLocalContacts(), fetchCities()]);
      setRows(list);
      setCities(cs);
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  const startCreate = () => { setEditingId(null); setForm({ name: "", facebook: "", phone: "", email: "", city: "" }); };
  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      facebook: row.facebook || "",
      phone: row.phone || "",
      email: row.email || "",
      city: cities.find((c) => c.name === row.city)?.id || "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setForm({ name: "", facebook: "", phone: "", email: "", city: "" }); };

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const payload = { ...form, city: form.city || null };
      if (editingId) await updateLocalContact(editingId, payload);
      else await createLocalContact(payload);
      await load(); cancelEdit();
    } catch (e) { setErr(e?.message || String(e)); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Usunąć tę osobę kontaktową?")) return;
    setErr("");
    try { await deleteLocalContact(id); await load(); } catch (e) { setErr(e?.message || String(e)); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać kontaktami lokalnymi.</p>
      </div>
    );

  return (
    
      <>
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak kontaktów.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Miasto</th>
                  <th className="cms-th">Imię i nazwisko</th>
                  <th className="cms-th">Facebook</th>
                  <th className="cms-th">Telefon</th>
                  <th className="cms-th">Email</th>
                  <th className="cms-th" style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">{r.city || "—"}</td>
                    <td className="cms-th" style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="cms-td">{r.facebook ? <a href={r.facebook} target="_blank" rel="noreferrer">link</a> : "—"}</td>
                    <td className="cms-td">{r.phone || "—"}</td>
                    <td className="cms-td">{r.email || "—"}</td>
                    <td className="cms-td">
                      <div className="cms-actions">
                        <button className="cms-btn" onClick={() => startEdit(r)}>Edytuj</button>
                        <button className="cms-btnDanger" onClick={() => handleDelete(r.id)}>Usuń</button>
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
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>{editingId ? "Edytuj kontakt" : "Nowy kontakt"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Imię i nazwisko</span>
            <input className="cms-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Miasto</span>
            <select className="cms-input" value={form.city || ""} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}>
              <option value="">— wybierz —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Facebook (URL)</span>
            <input className="cms-input" value={form.facebook} onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Telefon</span>
            <input className="cms-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Email</span>
            <input type="email" className="cms-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>Anuluj</button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj kontakt"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default function CMSScreens() {
  return (
    <div className="cms-page">
      <CitiesCMS />
      <LocalContactsCMS />
    </div>
  );
}
