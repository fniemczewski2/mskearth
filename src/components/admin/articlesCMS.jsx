import { useEffect, useState } from "react";
import {
  fetchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleAccept,
  togglePinned,
} from "../../services/db/article.jsx";
import useUploadFiles from "../../services/useUploadFiles.jsx"
import { supabase } from "../../services/supabaseClient.jsx";
import "../../style/admin.css"

function fmt(d) {
  const date = d ? new Date(d) : null;
  return date ? date.toLocaleString() : "—";
}

const emptyForm = {
  title: "",
  subtitle: "",
  content: "",
  titleen: "",
  subtitleen: "",
  contenten: "",
  titleua: "",
  subtitleua: "",
  contentua: "",
  imgurl: [],
  imgalt: "",
  author: "",
  sourcelink: "",
  sourcetext: "",
  accepted: false,
  published: false,
  pinned: false,
};

export default function ArticlesCMS() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await fetchArticles();
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

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, author: user?.email || "" });
    resetUploads();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || "",
      subtitle: row.subtitle || "",
      content: row.content || "",
      titleen: row.titleen || "",
      subtitleen: row.subtitleen || "",
      contenten: row.contenten || "",
      titleua: row.titleua || "",
      subtitleua: row.subtitleua || "",
      contentua: row.contentua || "",
      imgurl: row.imgPaths || [],
      imgalt: row.imgalt || "",
      author: row.author || user?.email || "",
      sourcelink: row.sourceLink || "",
      sourcetext: row.sourceText || "",
      accepted: !!row.accepted,
      published: !!row.published,
      pinned: !!row.pinned,
    });
    resetUploads();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    resetUploads();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const newPaths = fileIds && fileIds.length ? fileIds : [];
      const payload = { ...form, imgurl: [...(form.imgurl || []), ...newPaths] };
      if (editingId) {
        await updateArticle(editingId, payload);
      } else {
        await createArticle(payload);
      }
      await load();
      cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Usunąć ten artykuł?")) return;
    setErr("");
    try {
      await deleteArticle(id);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  async function handleToggle(id, kind) {
    setErr("");
    try {
      if (kind === "accept") await toggleAccept(id);
      if (kind === "pin") await togglePinned(id);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  if (!sessionChecked) return <div style={{ padding: 24 }}>Sprawdzanie sesji…</div>;
  if (!user)
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dostęp tylko dla zalogowanych</h1>
        <p>Zaloguj się, aby zarządzać artykułami.</p>
      </div>
    );

  return (
    <div className="cms-page">
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 14, color: "#666" }}>Brak artykułów.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Tytuł</th>
                  <th className="cms-th">Autor</th>
                  <th className="cms-th">Utworzono</th>
                  <th className="cms-th">Zaakcept.</th>
                  <th className="cms-th">Przypięty</th>
                  <th className="cms-th" style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">
                      <div style={{ fontWeight: 500 }}>{r.title || "(bez tytułu)"}</div>
                      {r.subtitle && <div style={{ color: "#6b7280" }}>{r.subtitle}</div>}
                    </td>
                    <td className="cms-td">{r.author || "—"}</td>
                    <td className="cms-td">{fmt(r.created)}</td>
                    <td className="cms-td">{r.accepted ? "✓" : "—"}</td>
                    <td className="cms-td">{r.pinned ? "✓" : "—"}</td>
                    <td className="cms-td">
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="cms-btn" onClick={() => startEdit(r)}><i className="bi bi-pencil-fill" aria-hidden="true"></i></button>
                        <button className="cms-btn" onClick={() => handleToggle(r.id, "accept")}>{r.accepted ? <i className="bi bi-eye-slash-fill" aria-hidden="true"></i> : <i className="bi bi-send-check-fill" aria-hidden="true"></i>}</button>
                        <button className="cms-btn" onClick={() => handleToggle(r.id, "pin")}>{r.pinned ? <i className="bi bi-pin-angle" aria-hidden="true"></i> : <i className="bi bi-pin-fill" aria-hidden="true"></i>}</button>
                        <button className="cms-btnDanger" onClick={() => handleDelete(r.id)}><i className="bi bi-trash-fill" aria-hidden="true"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        )}

      <aside className="cms-card">
        <h3 style={{ fontWeight: 600, marginTop: 0 }}>{editingId ? "Edytuj artykuł" : "Nowy artykuł"}</h3>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Tytuł</span>
            <input className="cms-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Podtytuł</span>
            <input className="cms-input" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Treść</span>
            <textarea className="cms-textarea" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </label>

          <details>
            <summary className="cms-detailsSummary">Wersje EN / UA</summary>
            <div className="cms-detailsBody">
              <input placeholder="Title (EN)" className="cms-input" value={form.titleen} onChange={(e) => setForm((f) => ({ ...f, titleen: e.target.value }))} />
              <input placeholder="Subtitle (EN)" className="cms-input" value={form.subtitleen} onChange={(e) => setForm((f) => ({ ...f, subtitleen: e.target.value }))} />
              <textarea placeholder="Content (EN)" className="cms-input"  style={{ minHeight: 80 }} value={form.contenten} onChange={(e) => setForm((f) => ({ ...f, contenten: e.target.value }))} />
              <input placeholder="Title (UA)" className="cms-input" value={form.titleua} onChange={(e) => setForm((f) => ({ ...f, titleua: e.target.value }))} />
              <input placeholder="Subtitle (UA)" className="cms-input" value={form.subtitleua} onChange={(e) => setForm((f) => ({ ...f, subtitleua: e.target.value }))} />
              <textarea placeholder="Content (UA)" className="cms-input"  style={{ minHeight: 80 }} value={form.contentua} onChange={(e) => setForm((f) => ({ ...f, contentua: e.target.value }))} />
            </div>
          </details>

          <label className="cms-labelWrap">
            <span className="cms-label">Alt obrazka</span>
            <input className="cms-input" value={form.imgalt} onChange={(e) => setForm((f) => ({ ...f, imgalt: e.target.value }))} />
          </label>

          <label className="cms-labelWrap">
            <span className="cms-label">Źródło (link i tekst)</span>
            <input placeholder="https://…" className="cms-input" value={form.sourcelink} onChange={(e) => setForm((f) => ({ ...f, sourcelink: e.target.value }))} />
            <input placeholder="Źródło: opis" className="cms-input" style={{ marginTop: 8 }} value={form.sourcetext} onChange={(e) => setForm((f) => ({ ...f, sourcetext: e.target.value }))} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.accepted} onChange={(e) => setForm((f) => ({ ...f, accepted: e.target.checked }))} />
              Zaakceptowany
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
              Przypięty
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Obrazy (drag & drop / wybierz)</span>
            <input type="file" multiple accept="image/*" onChange={async (e) => {
              await uploadFiles(e.target.files, { bucket: "mskearth", prefix: "articles", maxFiles: 6 });
            }} />
            {uploading && <div className="cms-helperXs">Przesyłanie…</div>}
            {uploadErrors?.length > 0 && (
              <ul className="cms-helperXs" style={{ color: "#b00020", marginTop: 8, paddingLeft: 18, listStyle: "disc" }}>
                {uploadErrors.map((er, i) => <li key={i}>{er.message}</li>)}
              </ul>
            )}
            {(form.imgurl?.length || 0) > 0 && (
              <div className="cms-chips">
                {form.imgurl.map((p) => (
                  <span key={p} className="cms-chip">
                    {p}
                    <button type="button" className="cms-chipRemove" onClick={() => setForm((f) => ({ ...f, imgurl: f.imgurl.filter((x) => x !== p) }))}>×</button>
                  </span>
                ))}
              </div>
            )}
            {fileIds?.length > 0 && (
              <div className="cms-helperXs">Nowe pliki: {fileIds.length}</div>
            )}
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>Anuluj</button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj artykuł"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="cms-labelWrap">
      <div className="cms-label">{label}</div>
      {children}
    </label>
  );
}
