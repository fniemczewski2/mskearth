import { useCallback, useEffect, useState } from 'react';

import {
  addWindow,
  createSurvey,
  deleteBooking,
  deleteSurvey,
  deleteWindow,
  fetchSurveyDetails,
  fetchSurveys,
  updateSurvey,
} from '../../survey/db/surveys.js';
import { formatDay, generateSlots, surveyUrl } from '../../survey/slots.js';
import '../admin.css';

const emptySurvey = { title: '', description: '', capacity: 1, max_slots_per_user: 1 };
const emptyWindow = { date: '', start: '12:00', end: '16:00', mode: 'full', slotMinutes: 60 };
const WINDOW_ERRORS = {
  date: 'Wybierz datę.',
  time: 'Podaj godzinę rozpoczęcia i zakończenia.',
  range: 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.',
  length: 'Długość fragmentu musi mieć co najmniej 5 minut i mieścić się w oknie.',
  tooMany: 'Za dużo slotów w jednym oknie (max 100). Zwiększ długość fragmentu.',
};

const hhmm = (t) => String(t).slice(0, 5);
const windowLabel = (w) =>
  `${formatDay(w.date ?? w.slot_date)}, ${hhmm(w.start ?? w.start_time)}–${hhmm(w.end ?? w.end_time)}`;

function csvCell(v) {
  const s = String(v ?? '');
  // Neutralizacja formul arkusza (CSV injection) + cudzyslowy.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(survey, details) {
  const slotById = new Map(details.slots.map((s) => [s.id, s]));
  const rows = [['Imię', 'E-mail', 'Data', 'Od', 'Do', 'Zgoda (data)', 'Wersja zgody']];
  for (const b of details.bookings) {
    const s = slotById.get(b.slot_id);
    rows.push([b.name, b.email, s?.slot_date, hhmm(s?.start_time ?? ''), hhmm(s?.end_time ?? ''), b.consent_at, b.consent_version]);
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zapisy-${survey.slug}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function WindowForm({ onAdd }) {
  const [w, setW] = useState(emptyWindow);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setW((x) => ({ ...x, [k]: e.target.value }));
  const preview = generateSlots({ date: w.date, start: w.start, end: w.end, slotMinutes: w.mode === 'full' ? null : Number(w.slotMinutes) });

  const submit = async () => {
    if (preview.error) return setErr(WINDOW_ERRORS[preview.error]);
    setErr('');
    await onAdd({ date: w.date, start: w.start, end: w.end, slotMinutes: w.mode === 'full' ? null : Number(w.slotMinutes) }, preview.slots);
    setW((x) => ({ ...emptyWindow, date: x.date, start: x.start, end: x.end, mode: x.mode, slotMinutes: x.slotMinutes }));
  };

  return (
    <fieldset className="cms-card" style={{ border: '1px solid #ddd' }}>
      <legend className="cms-label">Dodaj termin dostępności</legend>
      <div className="cms-grid">
        <label className="cms-labelWrap">
          <span className="cms-label">Dzień</span>
          <input className="cms-input" type="date" value={w.date} onChange={set('date')} />
        </label>
        <label className="cms-labelWrap">
          <span className="cms-label">Od</span>
          <input className="cms-input" type="time" value={w.start} onChange={set('start')} />
        </label>
        <label className="cms-labelWrap">
          <span className="cms-label">Do</span>
          <input className="cms-input" type="time" value={w.end} onChange={set('end')} />
        </label>
        <label className="cms-labelWrap">
          <span className="cms-label">Zapis na</span>
          <select className="cms-select" value={w.mode} onChange={set('mode')}>
            <option value="full">cały slot (całe okno)</option>
            <option value="part">krótszy fragment</option>
          </select>
        </label>
        {w.mode === 'part' && (
          <label className="cms-labelWrap">
            <span className="cms-label">Długość fragmentu (min)</span>
            <input className="cms-input" type="number" min="5" step="5" value={w.slotMinutes} onChange={set('slotMinutes')} />
          </label>
        )}
      </div>
      <p className="cms-helperXs" aria-live="polite">
        {preview.error ? '' : `Powstanie slotów: ${preview.slots.length}`}
      </p>
      {err && <div className="cms-error" role="alert">{err}</div>}
      <div className="cms-formActions">
        <button type="button" className="cms-btn" onClick={submit}>Dodaj termin</button>
      </div>
    </fieldset>
  );
}

function Editor({ survey, onBack, onChanged }) {
  const isNew = !survey;
  const [form, setForm] = useState(survey ? {
    title: survey.title, description: survey.description ?? '', capacity: survey.capacity, max_slots_per_user: survey.max_slots_per_user,
  } : emptySurvey);
  const [pending, setPending] = useState([]);
  const [details, setDetails] = useState({ windows: [], slots: [], bookings: [] });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = survey?.id;

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setDetails(await fetchSurveyDetails(id));
    } catch (e) { setErr(e?.message || String(e)); }
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  const fields = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    capacity: Number(form.capacity),
    max_slots_per_user: Number(form.max_slots_per_user),
  });

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e?.message || String(e)); } finally { setBusy(false); }
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setErr('Podaj tytuł ankiety.');
    if (isNew && pending.length === 0) return setErr('Dodaj co najmniej jeden termin dostępności.');
    run(async () => {
      if (isNew) {
        const created = await createSurvey(fields());
        try {
          for (const p of pending) await addWindow(created.id, p.win, p.slots);
        } catch (e) {
          await deleteSurvey(created.id);
          throw e;
        }
        onChanged(created);
      } else {
        await updateSurvey(id, fields());
        onChanged();
      }
    });
  };

  const onAddWindow = (win, slots) =>
    run(async () => {
      if (isNew) setPending((p) => [...p, { win, slots }]);
      else { await addWindow(id, win, slots); await reload(); onChanged(); }
    });

  const onDeleteWindow = (w) => {
    const n = details.bookings.filter((b) => details.slots.find((s) => s.id === b.slot_id)?.window_id === w.id).length;
    if (!confirm(n ? `Usunąć termin razem z ${n} zapisami?` : 'Usunąć ten termin?')) return;
    run(async () => { await deleteWindow(w.id); await reload(); onChanged(); });
  };

  const onDeleteBooking = (b) => {
    if (!confirm(`Usunąć zapis: ${b.name}?`)) return;
    run(async () => { await deleteBooking(b.id); await reload(); onChanged(); });
  };

  const link = survey ? surveyUrl(window.location.origin, 'pl', survey.slug) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr('Nie udało się skopiować. Zaznacz adres ręcznie.'); }
  };

  const slotById = new Map(details.slots.map((s) => [s.id, s]));
  const takenBySlot = new Map();
  for (const b of details.bookings) takenBySlot.set(b.slot_id, (takenBySlot.get(b.slot_id) ?? 0) + 1);

  return (
    <div className="cms-page">
      <div className="cms-formActions">
        <button type="button" className="cms-btn" onClick={onBack}>← Wróć do listy</button>
      </div>
      {err && <div className="cms-error" role="alert">{err}</div>}

      {survey && (
        <aside className="cms-card">
          <span className="cms-label">Publiczny adres ankiety</span>
          <input className="cms-input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Publiczny adres ankiety" />
          <div className="cms-formActions">
            <button type="button" className="cms-btn" onClick={copy}>{copied ? 'Skopiowano' : 'Kopiuj adres'}</button>
            <a className="cms-btn" href={link} target="_blank" rel="noreferrer">Otwórz</a>
          </div>
          <p className="cms-helperXs">Ankiety nie ma w menu ani stopce i jest ukryta przed wyszukiwarkami: dostępna tylko dla osób z linkiem.</p>
        </aside>
      )}

      <aside className="cms-card">
        <form onSubmit={save}>
          <div className="cms-grid">
            <label className="cms-labelWrap">
              <span className="cms-label">Tytuł</span>
              <input className="cms-input" value={form.title} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Miejsc w jednym slocie</span>
              <input className="cms-input" type="number" min="1" max="1000" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </label>
            <label className="cms-labelWrap">
              <span className="cms-label">Max slotów na osobę</span>
              <input className="cms-input" type="number" min="1" max="50" value={form.max_slots_per_user} onChange={(e) => setForm((f) => ({ ...f, max_slots_per_user: e.target.value }))} />
            </label>
          </div>
          <label className="cms-labelWrap">
            <span className="cms-label">Opis (opcjonalnie)</span>
            <textarea className="cms-textarea" rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <div className="cms-formActions">
            <button className="cms-btnPrimary" type="submit" disabled={busy}>{isNew ? 'Utwórz ankietę' : 'Zapisz zmiany'}</button>
          </div>
        </form>
      </aside>

      <WindowForm onAdd={onAddWindow} />

      <aside className="cms-card">
        <span className="cms-label">Terminy dostępności</span>
        {(isNew ? pending.length : details.windows.length) === 0 ? (
          <p className="cms-helperXs">Brak terminów.</p>
        ) : (
          <ul>
            {isNew
              ? pending.map((p, i) => (
                  <li key={i}>
                    {windowLabel(p.win)} — {p.win.slotMinutes ? `fragmenty ${p.win.slotMinutes} min` : 'cały slot'} ({p.slots.length})
                    <button type="button" className="cms-btnDanger" onClick={() => setPending((x) => x.filter((_, j) => j !== i))} aria-label={`Usuń termin ${windowLabel(p.win)}`}>Usuń</button>
                  </li>
                ))
              : details.windows.map((w) => (
                  <li key={w.id}>
                    {windowLabel(w)} — {w.slot_minutes ? `fragmenty ${w.slot_minutes} min` : 'cały slot'}
                    <button type="button" className="cms-btnDanger" onClick={() => onDeleteWindow(w)} aria-label={`Usuń termin ${windowLabel(w)}`}>Usuń</button>
                  </li>
                ))}
          </ul>
        )}
      </aside>

      {survey && (
        <aside className="cms-card">
          <span className="cms-label">Zapisy ({details.bookings.length})</span>
          {details.bookings.length === 0 ? (
            <p className="cms-helperXs">Nikt jeszcze się nie zapisał.</p>
          ) : (
            <>
              <table className="cms-table">
                <thead>
                  <tr><th className="cms-th">Termin</th><th className="cms-th">Imię</th><th className="cms-th">E-mail</th><th className="cms-th">Akcje</th></tr>
                </thead>
                <tbody>
                  {details.bookings
                    .slice()
                    .sort((a, b) => `${slotById.get(a.slot_id)?.slot_date}${slotById.get(a.slot_id)?.start_time}`.localeCompare(`${slotById.get(b.slot_id)?.slot_date}${slotById.get(b.slot_id)?.start_time}`))
                    .map((b) => (
                      <tr key={b.id}>
                        <td className="cms-td">{slotById.get(b.slot_id) ? windowLabel(slotById.get(b.slot_id)) : '—'}</td>
                        <td className="cms-td">{b.name}</td>
                        <td className="cms-td">{b.email}</td>
                        <td className="cms-td"><button type="button" className="cms-btnDanger" onClick={() => onDeleteBooking(b)} aria-label={`Usuń zapis: ${b.name}`}>Usuń</button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="cms-formActions">
                <button type="button" className="cms-btn" onClick={() => exportCsv(survey, details)}>Pobierz CSV</button>
              </div>
            </>
          )}
          <span className="cms-label">Zajętość slotów</span>
          <ul>
            {details.slots.map((s) => (
              <li key={s.id}>{windowLabel(s)}: {takenBySlot.get(s.id) ?? 0}/{survey.capacity}</li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

export default function SurveysCMS() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null); // null = lista, 'new' lub wiersz

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setRows(await fetchSurveys()); } catch (e) { setErr(e?.message || String(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleClosed = async (r) => {
    try { await updateSurvey(r.id, { closed: !r.closed }); await load(); } catch (e) { setErr(e?.message || String(e)); }
  };
  const remove = async (r) => {
    if (!confirm(`Usunąć ankietę „${r.title}” razem ze wszystkimi zapisami? Tej operacji nie można cofnąć.`)) return;
    try { await deleteSurvey(r.id); await load(); } catch (e) { setErr(e?.message || String(e)); }
  };

  if (editing) {
    return (
      <Editor
        key={editing === 'new' ? 'new' : editing.id}
        survey={editing === 'new' ? null : editing}
        onBack={() => { setEditing(null); load(); }}
        onChanged={(created) => { if (created) setEditing(created); load(); }}
      />
    );
  }

  return (
    <div className="cms-page">
      <div className="cms-formActions">
        <button type="button" className="cms-btnPrimary" onClick={() => setEditing('new')}>Nowa ankieta</button>
      </div>
      {err && <div className="cms-error" role="alert">{err}</div>}
      {loading ? (
        <div>Ładowanie…</div>
      ) : rows.length === 0 ? (
        <div className="cms-helperXs">Brak ankiet.</div>
      ) : (
        <aside className="cms-card">
          <table className="cms-table">
            <thead>
              <tr>
                <th className="cms-th">Tytuł</th><th className="cms-th">Sloty</th><th className="cms-th">Zapisy</th><th className="cms-th">Status</th>
                <th className="cms-th" style={{ textAlign: 'right' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cms-td" style={{ fontWeight: 500 }}>{r.title}</td>
                  <td className="cms-td">{r.survey_slots?.[0]?.count ?? 0}</td>
                  <td className="cms-td">{r.survey_bookings?.[0]?.count ?? 0}</td>
                  <td className="cms-td">{r.closed ? 'Zamknięta' : 'Otwarta'}</td>
                  <td className="cms-td">
                    <div className="cms-actions">
                      <button type="button" className="cms-btn" onClick={() => setEditing(r)}>Zarządzaj</button>
                      <button type="button" className="cms-btn" onClick={() => toggleClosed(r)}>{r.closed ? 'Otwórz' : 'Zamknij'}</button>
                      <button type="button" className="cms-btnDanger" onClick={() => remove(r)} aria-label={`Usuń: ${r.title}`}><i className="bi bi-trash-fill" aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}
    </div>
  );
}
