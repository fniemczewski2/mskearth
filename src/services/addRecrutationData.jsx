const toUrl = (v) => {
  const s = (v || '').trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

export function AddRecrutationData({ onAdd } = {}) {
  const instagramId = useId();
  const formId = useId();
  const statusId = useId();

  const [instagram, setInstagram] = useState('');
  const [form, setForm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Zapisywanie…' });

    const payload = {
      instagram: toUrl(instagram),
      form: toUrl(form),
    };

    try {
      // Remove previous rows (keeps behavior of your original delete '*')
      await supabase.from('recruitments').delete().not('id', 'is', null);

      const { error } = await supabase.from('recruitments').insert(payload);
      if (error) throw error;

      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
      setInstagram('');
      setForm('');
      if (typeof onAdd === 'function') onAdd();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="addDataForm" onSubmit={handleSubmit} noValidate aria-describedby={status.message ? statusId : undefined}>
      <h3 className="formHeader">Rekrutacja – Dane</h3>

      <p id={statusId} role="status" aria-live="polite" className={`formStatus ${status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''}`}>
        {status.message}
      </p>

      <label htmlFor={instagramId} className="formLabel">Instagram</label>
      <input
        className="formField"
        id={instagramId}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://instagram.com/twojprofil"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        pattern="https?://.*"
      />

      <label htmlFor={formId} className="formLabel">Formularz</label>
      <input
        className="formField"
        id={formId}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://…"
        value={form}
        onChange={(e) => setForm(e.target.value)}
        pattern="https?://.*"
      />

      <button className="formBtn" type="submit" disabled={submitting} aria-busy={submitting ? 'true' : 'false'}>
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
}

// ===================== AddRecrutationCallData =====================
export function AddRecrutationCallData() {
  const dateId = useId();
  const timeId = useId();
  const linkId = useId();
  const statusId = useId();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Zapisywanie…' });

    const payload = {
      date,                      // YYYY-MM-DD
      time,                      // HH:MM
      link: toUrl(link),         // normalized URL
    };

    try {
      const { error } = await supabase.from('recruitment_calls').insert(payload);
      if (error) throw error;

      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
      setDate('');
      setTime('');
      setLink('');
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = date && time;

  return (
    <form className="addDataForm" onSubmit={handleSubmit} noValidate aria-describedby={status.message ? statusId : undefined}>
      <h3 className="formHeader">Rekrutacja – Call</h3>

      <p id={statusId} role="status" aria-live="polite" className={`formStatus ${status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''}`}>
        {status.message}
      </p>

      <label htmlFor={dateId} className="formLabel">Data <span aria-hidden="true">*</span></label>
      <input
        className="formField"
        id={dateId}
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <label htmlFor={timeId} className="formLabel">Godzina <span aria-hidden="true">*</span></label>
      <input
        className="formField"
        id={timeId}
        type="time"
        required
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <label htmlFor={linkId} className="formLabel">Link</label>
      <input
        className="formField"
        id={linkId}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://meet…"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        pattern="https?://.*"
      />

      <button className="formBtn" type="submit" disabled={!canSubmit || submitting} aria-busy={submitting ? 'true' : 'false'}>
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
}
