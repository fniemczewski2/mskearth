import { useEffect, useState } from 'react';
import { fetchCities } from '../../map/db/cities.js';
import {
  fetchContactPeople,
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
} from '../../contact/db/contactPeople.js';

import { useConfirm } from '../../../shared/components/ConfirmDialog.jsx';

const emptyForm = { name: '', phone: '', email: '', city: '' };

export default function ContactPeopleCMS() {
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [cities, setCities] = useState([]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [list, cs] = await Promise.all([fetchContactPeople(), fetchCities()]);
      setRows(list);
      setCities(cs);
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
      phone: row.phone || '',
      email: row.email || '',
      city: row.city || '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const payload = { ...form, city: form.city || null };
      if (editingId) await updateContactPerson(editingId, payload);
      else await createContactPerson(payload);
      await load();
      cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!(await confirm('Usunąć tę osobę?'))) return;
    setErr('');
    try {
      await deleteContactPerson(id);
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="cms-page">
      {dialog}
      <section>
        {err && <div className="cms-error">{err}</div>}
        {loading ? (
          <div>Ładowanie…</div>
        ) : rows.length === 0 ? (
          <div className="cms-empty">Brak osób.</div>
        ) : (
          <aside className="cms-card">
            <table className="cms-table">
              <thead>
                <tr>
                  <th className="cms-th">Miasto</th>
                  <th className="cms-th">Imię i nazwisko</th>
                  <th className="cms-th">Telefon</th>
                  <th className="cms-th">Email</th>
                  <th className="cms-th cms-th--right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="cms-td">{r.city || '-'}</td>
                    <td className="cms-td cms-strong">{r.name}</td>
                    <td className="cms-td">{r.phone || '-'}</td>
                    <td className="cms-td">{r.email || '-'}</td>
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
          <label className="cms-labelWrap">
            <span className="cms-label">Miasto</span>
            <select
              className="cms-input"
              value={form.city || ''}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">- wybierz -</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Telefon</span>
            <input
              className="cms-input"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label className="cms-labelWrap">
            <span className="cms-label">Email</span>
            <input
              type="email"
              className="cms-input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>

          <div className="cms-formActions">
            {editingId && (
              <button type="button" className="cms-btn" onClick={cancelEdit}>
                Anuluj
              </button>
            )}
            <button disabled={saving} className="cms-btnPrimary">
              {saving ? 'Zapisywanie…' : editingId ? 'Zapisz zmiany' : 'Dodaj osobę'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
