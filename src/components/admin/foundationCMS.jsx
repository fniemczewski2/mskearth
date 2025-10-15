import { useEffect, useState } from "react";
import useUploadFiles from "../../services/useUploadFiles.jsx"

import {
  fetchFoundationBoardMembers,
  createFoundationBoardMember,
  updateFoundationBoardMember,
  deleteFoundationBoardMember,
} from "../../services/db/foundationBoard.jsx";
import {
  fetchFinancialReports,
  createFinancialReport,
} from "../../services/db/financialReports.jsx";

import { supabase } from "../../services/supabaseClient.jsx";

const emptyMember = {
  name: "",
  role: "",
  role_en: "",
  role_ua: "",
  description: "",
  description_en: "",
  description_ua: "",
  phone: "",
  email: "",
  img_path: "",
};

function BoardMembersCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [saving, setSaving] = useState(false);

  const { fileIds, uploadFiles, uploading, errors: uploadErrors, reset: resetUploads } = useUploadFiles("mskearth");

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
    setLoading(true); setErr("");
    try { const list = await fetchFoundationBoardMembers(); setRows(list); }
    catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      role: row.role || "",
      role_en: row.role_en || "",
      role_ua: row.role_ua || "",
      description: row.description || "",
      description_en: row.description_en || "",
      description_ua: row.description_ua || "",
      phone: row.phone || "",
      email: row.email || "",
      img_path: row.img_path || "",
    });
    resetUploads();
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyMember); resetUploads(); };

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const newImg = (fileIds && fileIds.length > 0) ? fileIds[0] : null;
      const payload = { ...form, img_path: newImg || form.img_path || null };
      if (editingId) await updateFoundationBoardMember(editingId, payload);
      else await createFoundationBoardMember(payload);
      await load(); cancelEdit();
    } catch (e) { setErr(e?.message || String(e)); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Usunąć członka zarządu?")) return;
    setErr("");
    try { await deleteFoundationBoardMember(id); await load(); } catch (e) { setErr(e?.message || String(e)); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać zarządem fundacji.</p>
      </div>
    );

  return (
    <>
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak pozycji.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Imię i nazwisko</th>
                  <th className="cms-th">Rola (PL/EN/UA)</th>
                  <th className="cms-th">Mail</th>
                  <th className="cms-th">Telefon</th>
                  <th className="cms-th" style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td"style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="cms-td">
                      <div>{r.role || "—"}</div>
                      <div style={{ color: "#666" }}>{r.role_en || "—"} | {r.role_ua || "—"}</div>
                    </td>
                    <td className="cms-td">
                      <div>{r.email || "—"}</div>
                    </td>
                    <td className="cms-td">
                      <div>{r.phone || "—"}</div>
                    </td>
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
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>{editingId ? "Edytuj osobę" : "Nowa osoba"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Imię i nazwisko</span>
            <input className="cms-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>

          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (PL)</span>
              <input className="cms-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (EN)</span>
              <input className="cms-input" value={form.role_en} onChange={(e) => setForm((f) => ({ ...f, role_en: e.target.value }))} />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (UA)</span>
              <input className="cms-input" value={form.role_ua} onChange={(e) => setForm((f) => ({ ...f, role_ua: e.target.value }))} />
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Opis (PL)</span>
            <textarea className="cms-textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Opis (EN)</span>
              <textarea className="cms-textarea" style={{ minHeight: 80 }} value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Opis (UA)</span>
              <textarea className="cms-textarea" style={{ minHeight: 80 }} value={form.description_ua} onChange={(e) => setForm((f) => ({ ...f, description_ua: e.target.value }))} />
            </label>
          </div>

          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Email</span>
              <input type="email" className="cms-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Telefon</span>
              <input className="cms-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Zdjęcie (1 plik)</span>
            <input type="file" accept="image/*" onChange={async (e) => {
              await uploadFiles(e.target.files, { bucket: "mskearth", prefix: "foundation/board", maxFiles: 1 });
            }} />
            {uploading && <div className="cms-helperXs">Przesyłanie…</div>}
            {fileIds?.length > 0 && (
              <div className="cms-helperXs">Wybrano plik: {fileIds[0]}</div>
            )}
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>Anuluj</button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj osobę"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

const emptyReport = { year: new Date().getFullYear(), file_path: "", author: "" };

function FinancialReportsCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState(emptyReport);
  const [saving, setSaving] = useState(false);

  const { fileIds, uploadFiles, uploading, reset: resetUploads } = useUploadFiles("mskearth");

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
    try { const list = await fetchFinancialReports(); setRows(list); }
    catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sessionChecked && user) load(); }, [sessionChecked, user]);

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const path = (fileIds && fileIds.length > 0) ? fileIds[0] : form.file_path || null;
      await createFinancialReport({ year: Number(form.year), file_path: path, author: user?.email || form.author || null });
      await load();
      setForm({ ...emptyReport, year: form.year });
      resetUploads();
    } catch (e) { setErr(e?.message || String(e)); } finally { setSaving(false); }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać sprawozdaniami finansowymi.</p>
      </div>
    );

  return (
    <>
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak sprawozdań.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Rok</th>
                  <th className="cms-th">Plik</th>
                  <th className="cms-th">Autor</th>
                  <th className="cms-th">Utworzono</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">{r.year}</td>
                    <td className="cms-td">{r.file_path || "—"}</td>
                    <td className="cms-td">{r.author || "—"}</td>
                    <td className="cms-td">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        )}
      </section>

      <aside className="cms-card">
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>Dodaj sprawozdanie</h3>
        <form onSubmit={handleCreate}>
          <label className="cms-labelWrap">
            <span className="cms-label">Rok</span>
            <input type="number" className="cms-input" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Plik (PDF)</span>
            <input type="file" onChange={async (e) => {
              await uploadFiles(e.target.files, { bucket: "mskearth", prefix: "foundation/reports", maxFiles: 1 });
            }} />
            {uploading && <div className="cms-helperXs">Przesyłanie…</div>}
            {fileIds?.length > 0 && (
              <div className="cms-helperXs">Wybrano plik: {fileIds[0]}</div>
            )}
          </label>
          <div className="cms-formActions">
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : "Dodaj"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default function FoundationCMS() {
  return (
    
    <div className="cms-page">
      <BoardMembersCMS />
      <FinancialReportsCMS />
    </div>
  );
}
