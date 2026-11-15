import { useEffect, useState } from 'react';
import { ADMIN_PAGE_SIZE, STORAGE_BUCKET } from '../../../shared/config/site.js';
import useAdminUser from '../useAdminUser.js';
import {
  fetchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleAccept,
  togglePinned,
} from '../../news/db/article.js';
import useUploadFiles from '../../../services/storage/useUploadFiles.js';
import { useConfirm } from '../../../shared/components/ConfirmDialog.jsx';

function fmt(d) {
  const date = d ? new Date(d) : null;
  return date ? date.toLocaleString() : '-';
}

const emptyForm = {
  title: '',
  subtitle: '',
  content: '',
  titleen: '',
  subtitleen: '',
  contenten: '',
  imgurl: [],
  imgalt: '',
  author: '',
  sourcelink: '',
  sourcetext: '',
  accepted: false,
  published: null,
  pinned: false,
};

// Data publikacji liczona w chwili tworzenia formularza, nie przy zaladowaniu modulu.
const freshForm = (author = '') => ({ ...emptyForm, author, published: new Date().toISOString() });

export default function ArticlesCMS() {
  const { confirm, dialog } = useConfirm();
  const user = useAdminUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => freshForm());
  const [saving, setSaving] = useState(false);

  const {
    fileIds,
    uploadFiles,
    uploading,
    errors: uploadErrors,
    reset: resetUploads,
  } = useUploadFiles(STORAGE_BUCKET);

  const [hasMore, setHasMore] = useState(false);

  // Wczytuje pierwsze `count` wierszy; "Wczytaj więcej" zwieksza liczbe o kolejna strone.
  const load = async (count = Math.max(rows.length, ADMIN_PAGE_SIZE)) => {
    setLoading(true);
    setErr('');
    try {
      const list = await fetchArticles({ limit: count + 1 });
      setHasMore(list.length > count);
      setRows(list.slice(0, count));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(ADMIN_PAGE_SIZE);
    // Jednorazowe wczytanie po zamontowaniu; load zalezy od biezacego stanu listy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(freshForm(user?.email || ''));
    resetUploads();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      subtitle: row.subtitle || '',
      content: row.content || '',
      titleen: row.titleen || '',
      subtitleen: row.subtitleen || '',
      contenten: row.contenten || '',
      imgurl: row.imgPaths || [],
      imgalt: row.imgalt || '',
      author: row.author || user?.email || '',
      sourcelink: row.sourcelink || '',
      sourcetext: row.sourcetext || '',
      accepted: Boolean(row.accepted),
      pinned: Boolean(row.pinned),
      published: row.published ?? null,
    });
    resetUploads();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(freshForm(user?.email || ''));
    resetUploads();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const newPaths = fileIds && fileIds.length ? fileIds : [];
      const payload = { ...form, imgurl: [...(form.imgurl || []), ...newPaths] };
      if (payload.imgurl.length > 0 && !payload.imgalt.trim()) {
        throw new Error('Dodaj opis alternatywny obrazka (pole „Alt obrazka”).');
      }
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
    if (!(await confirm('Usunąć ten artykuł?'))) return;
    setErr('');
    try {
      await deleteArticle(id);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  async function handleToggle(row, kind) {
    setErr('');
    try {
      if (kind === 'accept') await toggleAccept(row.id, row.accepted);
      if (kind === 'pin') await togglePinned(row.id, row.pinned);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="cms-page">
      {dialog}
      {err && <div className="cms-error">{err}</div>}
      {loading ? (
        <div>Ładowanie…</div>
      ) : rows.length === 0 ? (
        <div className="cms-empty">Brak artykułów.</div>
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
                <th className="cms-th cms-th--right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cms-td">
                    <div className="cms-strong">{r.title || '(bez tytułu)'}</div>
                    {r.subtitle && <div className="cms-muted">{r.subtitle}</div>}
                  </td>
                  <td className="cms-td">{r.author || '-'}</td>
                  <td className="cms-td">{fmt(r.created)}</td>
                  <td className="cms-td">{r.accepted ? 'Tak' : 'Nie'}</td>
                  <td className="cms-td">{r.pinned ? 'Tak' : 'Nie'}</td>
                  <td className="cms-td">
                    <div className="cms-actions">
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() => startEdit(r)}
                        aria-label={`Edytuj: ${r.title || 'bez tytułu'}`}
                      >
                        <i className="bi bi-pencil-fill" aria-hidden="true"></i>
                      </button>
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() => handleToggle(r, 'accept')}
                        aria-label={`${r.accepted ? 'Cofnij akceptację' : 'Zaakceptuj'}: ${r.title || 'bez tytułu'}`}
                      >
                        {r.accepted ? (
                          <i className="bi bi-eye-slash-fill" aria-hidden="true"></i>
                        ) : (
                          <i className="bi bi-send-check-fill" aria-hidden="true"></i>
                        )}
                      </button>
                      <button
                        type="button"
                        className="cms-btn"
                        onClick={() => handleToggle(r, 'pin')}
                        aria-label={`${r.pinned ? 'Odepnij' : 'Przypnij'}: ${r.title || 'bez tytułu'}`}
                      >
                        {r.pinned ? (
                          <i className="bi bi-pin-angle" aria-hidden="true"></i>
                        ) : (
                          <i className="bi bi-pin-fill" aria-hidden="true"></i>
                        )}
                      </button>
                      <button
                        type="button"
                        className="cms-btnDanger"
                        onClick={() => handleDelete(r.id)}
                        aria-label={`Usuń: ${r.title || 'bez tytułu'}`}
                      >
                        <i className="bi bi-trash-fill" aria-hidden="true"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button
              type="button"
              className="cms-btn cms-gapTop"
              onClick={() => load(rows.length + ADMIN_PAGE_SIZE)}
            >
              Wczytaj więcej
            </button>
          )}
        </aside>
      )}

      <aside className="cms-card">
        <div className="cms-headingRow">
          <h2 className="cms-heading">{editingId ? 'Edytuj artykuł' : 'Nowy artykuł'}</h2>
          {editingId && (
            <button type="button" className="cms-btn" onClick={startCreate}>
              Nowy artykuł
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Tytuł</span>
            <input
              className="cms-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Podtytuł</span>
            <input
              className="cms-input"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Treść</span>
            <textarea
              className="cms-textarea"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </label>

          <details>
            <summary className="cms-detailsSummary">Wersja EN</summary>
            <div className="cms-detailsBody">
              <input
                aria-label="Tytuł (EN)"
                placeholder="Title (EN)"
                className="cms-input"
                value={form.titleen}
                onChange={(e) => setForm((f) => ({ ...f, titleen: e.target.value }))}
              />
              <input
                aria-label="Podtytuł (EN)"
                placeholder="Subtitle (EN)"
                className="cms-input"
                value={form.subtitleen}
                onChange={(e) => setForm((f) => ({ ...f, subtitleen: e.target.value }))}
              />
              <textarea
                aria-label="Treść (EN)"
                placeholder="Content (EN)"
                className="cms-input cms-textarea--short"
                value={form.contenten}
                onChange={(e) => setForm((f) => ({ ...f, contenten: e.target.value }))}
              />
              <input aria-label="Tytuł (UA)" placeholder="Title (UA)" className="cms-input" />
              <input aria-label="Podtytuł (UA)" placeholder="Subtitle (UA)" className="cms-input" />
              <textarea
                aria-label="Treść (UA)"
                placeholder="Content (UA)"
                className="cms-input cms-textarea--short"
              />
            </div>
          </details>

          <label className="cms-labelWrap">
            <span className="cms-label">Alt obrazka</span>
            <input
              className="cms-input"
              value={form.imgalt}
              onChange={(e) => setForm((f) => ({ ...f, imgalt: e.target.value }))}
            />
          </label>

          <label className="cms-labelWrap">
            <span className="cms-label">Źródło (link i tekst)</span>
            <input
              aria-label="Link do źródła"
              placeholder="https://…"
              className="cms-input"
              value={form.sourcelink}
              onChange={(e) => setForm((f) => ({ ...f, sourcelink: e.target.value }))}
            />
            <input
              aria-label="Opis źródła"
              placeholder="Źródło: opis"
              className="cms-input cms-gapTop"
              value={form.sourcetext}
              onChange={(e) => setForm((f) => ({ ...f, sourcetext: e.target.value }))}
            />
          </label>

          <div className="cms-checkGrid">
            <label className="cms-check">
              <input
                type="checkbox"
                checked={form.accepted}
                onChange={(e) => setForm((f) => ({ ...f, accepted: e.target.checked }))}
              />
              Zaakceptowany
            </label>
            <label className="cms-check">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
              />
              Przypięty
            </label>
            <label className="cms-check">
              <input
                type="checkbox"
                checked={Boolean(form.published)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    published: e.target.checked ? (f.published ?? new Date().toISOString()) : null,
                  }))
                }
              />
              Opublikowany
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Obrazy (drag & drop / wybierz)</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={async (e) => {
                await uploadFiles(e.target.files, {
                  bucket: STORAGE_BUCKET,
                  prefix: 'articles',
                  maxFiles: 6,
                });
              }}
            />
            {uploading && <div className="cms-helperXs">Przesyłanie…</div>}
            {uploadErrors?.length > 0 && (
              <ul className="cms-helperXs cms-errorList">
                {uploadErrors.map((er) => (
                  <li key={`${er.index}-${er.message}`}>{er.message}</li>
                ))}
              </ul>
            )}
            {(form.imgurl?.length || 0) > 0 && (
              <div className="cms-chips">
                {form.imgurl.map((p) => (
                  <span key={p} className="cms-chip">
                    {p}
                    <button
                      type="button"
                      className="cms-chipRemove"
                      aria-label={`Usuń obraz ${p}`}
                      onClick={() => setForm((f) => ({ ...f, imgurl: f.imgurl.filter((x) => x !== p) }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {fileIds?.length > 0 && <div className="cms-helperXs">Nowe pliki: {fileIds.length}</div>}
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>
                Anuluj
              </button>
            )}
            <button type="submit" disabled={saving || uploading} className="cms-btnPrimary">
              {saving ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Dodaj artykuł'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
