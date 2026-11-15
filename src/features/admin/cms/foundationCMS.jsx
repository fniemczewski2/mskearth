import { useEffect, useState } from 'react';
import { STORAGE_BUCKET } from '../../../shared/config/site.js';
import useAdminUser from '../useAdminUser.js';
import useUploadFiles from '../../../services/storage/useUploadFiles.js';
import { useConfirm } from '../../../shared/components/ConfirmDialog.jsx';

import {
  fetchFoundationBoardMembers,
  createFoundationBoardMember,
  updateFoundationBoardMember,
  deleteFoundationBoardMember,
} from '../../foundation/db/foundationBoard.js';
import { fetchFinancialReports, createFinancialReport } from '../../foundation/db/financialReports.js';

const emptyMember = {
  name: '',
  role: '',
  role_en: '',
  description: '',
  description_en: '',
  phone: '',
  email: '',
  img_path: '',
};

function BoardMembersCMS() {
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [saving, setSaving] = useState(false);

  const {
    fileIds,
    uploadFiles,
    uploading,
    errors: uploadErrors,
    reset: resetUploads,
  } = useUploadFiles(STORAGE_BUCKET);
  const uploadErrorMsg = uploadErrors?.[0]?.message ?? '';

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await fetchFoundationBoardMembers();
      setRows(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      role: row.role || '',
      role_en: row.role_en || '',
      description: row.description || '',
      description_en: row.description_en || '',
      phone: row.phone || '',
      email: row.email || '',
      img_path: row.img_path || '',
    });
    resetUploads();
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyMember);
    resetUploads();
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const newImg = fileIds?.length > 0 ? fileIds[fileIds.length - 1] : null;
      const payload = { ...form, img_path: newImg || form.img_path || null };
      if (editingId) await updateFoundationBoardMember(editingId, payload);
      else await createFoundationBoardMember(payload);
      await load();
      cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!(await confirm('Usunąć członka zarządu?'))) return;
    setErr('');
    try {
      await deleteFoundationBoardMember(id);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <>
      {dialog}
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div className="cms-empty">Brak pozycji.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Imię i nazwisko</th>
                  <th className="cms-th">Rola (PL/EN)</th>
                  <th className="cms-th">Mail</th>
                  <th className="cms-th">Telefon</th>
                  <th className="cms-th cms-th--right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td cms-strong">{r.name}</td>
                    <td className="cms-td">
                      <div>{r.role || '-'}</div>
                      <div className="cms-muted"></div>
                    </td>
                    <td className="cms-td">
                      <div>{r.email || '-'}</div>
                    </td>
                    <td className="cms-td">
                      <div>{r.phone || '-'}</div>
                    </td>
                    <td className="cms-td">
                      <div className="cms-actions">
                        <button
                          type="button"
                          className="cms-btn"
                          onClick={() => startEdit(r)}
                          aria-label={`Edytuj: ${r.name}`}
                        >
                          <i className="bi bi-pencil-fill" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className="cms-btnDanger"
                          onClick={() => handleDelete(r.id)}
                          aria-label={`Usuń: ${r.name}`}
                        >
                          <i className="bi bi-trash-fill" aria-hidden="true"></i>
                        </button>
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
        <h2 className="cms-heading">{editingId ? 'Edytuj osobę' : 'Nowa osoba'}</h2>
        <form onSubmit={handleSubmit}>
          <label className="cms-labelWrap">
            <span className="cms-label">Imię i nazwisko</span>
            <input
              className="cms-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (PL)</span>
              <input
                className="cms-input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (EN)</span>
              <input
                className="cms-input"
                value={form.role_en}
                onChange={(e) => setForm((f) => ({ ...f, role_en: e.target.value }))}
              />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Rola (UA)</span>
              <input className="cms-input" />
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Opis (PL)</span>
            <textarea
              className="cms-textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Opis (EN)</span>
              <textarea
                className="cms-textarea cms-textarea--short"
                value={form.description_en}
                onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
              />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Opis (UA)</span>
              <textarea className="cms-textarea cms-textarea--short" />
            </label>
          </div>

          <div className="cms-grid2">
            <label className="cms-labelWrap">
              <span className="cms-label">Email</span>
              <input
                type="email"
                className="cms-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Telefon</span>
              <input
                className="cms-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
          </div>

          <label className="cms-labelWrap">
            <span className="cms-label">Zdjęcie (1 plik)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={async (e) => {
                await uploadFiles(e.target.files, {
                  bucket: STORAGE_BUCKET,
                  prefix: 'foundation/board',
                  maxFiles: 1,
                });
              }}
            />
            {uploading && <div className="cms-helperXs">Przesyłanie…</div>}
            {uploadErrorMsg && (
              <div className="cms-error" role="alert">
                {uploadErrorMsg}
              </div>
            )}
            {fileIds?.length > 0 && (
              <div className="cms-helperXs">Wybrano plik: {fileIds[fileIds.length - 1]}</div>
            )}
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>
                Anuluj
              </button>
            )}
            <button type="submit" disabled={saving || uploading} className="cms-btnPrimary">
              {saving ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Dodaj osobę'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

const emptyReport = { year: new Date().getFullYear(), file_path: '', author: '' };

function FinancialReportsCMS() {
  const user = useAdminUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [form, setForm] = useState(emptyReport);
  const [saving, setSaving] = useState(false);

  const {
    fileIds,
    uploadFiles,
    uploading,
    errors: uploadErrors,
    reset: resetUploads,
  } = useUploadFiles(STORAGE_BUCKET);
  const uploadErrorMsg = uploadErrors?.[0]?.message ?? '';

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await fetchFinancialReports();
      setRows(list);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const path = fileIds?.length > 0 ? fileIds[fileIds.length - 1] : form.file_path || null;
      if (!path) throw new Error('Dodaj plik PDF ze sprawozdaniem.');
      await createFinancialReport({
        year: Number(form.year),
        file_path: path,
        author: user?.email || form.author || null,
      });
      await load();
      setForm({ ...emptyReport, year: form.year });
      resetUploads();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div className="cms-empty">Brak sprawozdań.</div>
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
                    <td className="cms-td">{r.file_path || '-'}</td>
                    <td className="cms-td">{r.author || '-'}</td>
                    <td className="cms-td">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        )}
      </section>

      <aside className="cms-card">
        <h2 className="cms-heading">Dodaj sprawozdanie</h2>
        <form onSubmit={handleCreate}>
          <label className="cms-labelWrap">
            <span className="cms-label">Rok</span>
            <input
              type="number"
              className="cms-input"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              required
            />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Plik (PDF)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={async (e) => {
                await uploadFiles(e.target.files, {
                  bucket: STORAGE_BUCKET,
                  prefix: 'foundation/reports',
                  maxFiles: 1,
                  kind: 'pdf',
                });
              }}
            />
            {uploading && (
              <div className="cms-helperXs" role="status">
                Przesyłanie…
              </div>
            )}
            {uploadErrorMsg && (
              <div className="cms-error" role="alert">
                {uploadErrorMsg}
              </div>
            )}
            {fileIds?.length > 0 && (
              <div className="cms-helperXs">Wybrano plik: {fileIds[fileIds.length - 1]}</div>
            )}
          </label>
          <div className="cms-formActions">
            <button type="submit" disabled={saving || uploading} className="cms-btnPrimary">
              {saving ? 'Zapisywanie…' : 'Dodaj'}
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
