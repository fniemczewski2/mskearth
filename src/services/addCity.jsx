import { useId, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const VOIVODESHIPS = [
  'dolnośląskie','kujawsko-pomorskie','lubelskie','lubuskie','łódzkie',
  'małopolskie','mazowieckie','opolskie','podkarpackie','podlaskie',
  'pomorskie','śląskie','świętokrzyskie','warmińsko-mazurskie','wielkopolskie',
  'zachodniopomorskie'
];

const initialForm = {
  name: '',
  facebook: '',
  instagram: '',
  meetings: '',
  voivodeship: '',
};

function normalizeUrlOrNull(value) {
  const v = (value || '').trim();
  if (!v) return null;
  try {
    // Allow users to paste without protocol
    const hasProtocol = /^https?:\/\//i.test(v);
    const url = new URL(hasProtocol ? v : `https://${v}`);
    return url.toString();
  } catch {
    // Let native validation surface errors when pattern/type is used
    return v;
  }
}

const CityForm = () => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const nameId = useId();
  const facebookId = useId();
  const instagramId = useId();
  const meetingsId = useId();
  const voivodeshipId = useId();
  const statusId = useId();

  const orderedVoivodeships = useMemo(
    () => [...VOIVODESHIPS].sort((a, b) => a.localeCompare(b, 'pl')),
    []
  );

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const payload = {
      name: form.name.trim(),
      facebook: normalizeUrlOrNull(form.facebook),
      instagram: normalizeUrlOrNull(form.instagram),
      meetings: form.meetings.trim() || null,
      voivodeship: form.voivodeship,
    };

    try {
      const { error } = await supabase.from('cities').insert(payload);
      if (error) throw error;

      setForm(initialForm);
      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
    } catch (err) {
      console.error(err);
      setStatus({
        type: 'error',
        message:
          'Wystąpił błąd podczas zapisu. Spróbuj ponownie lub sprawdź połączenie.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="addDataForm"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={status.message ? statusId : undefined}
    >
      <h3 className="formHeader">Grupa lokalna</h3>

      {/* Live region for screen readers; also visible to sighted users if you style it */}
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`formStatus ${
          status.type === 'error'
            ? 'is-error'
            : status.type === 'success'
            ? 'is-success'
            : ''
        }`}
      >
        {status.message}
      </p>

      <label className="formLabel" htmlFor={nameId}>
        Nazwa grupy lokalnej <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={nameId}
        name="name"
        type="text"
        required
        autoComplete="organization"
        inputMode="text"
        value={form.name}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={facebookId}>
        Facebook grupy lokalnej
      </label>
      <input
        className="formField"
        id={facebookId}
        name="facebook"
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://facebook.com/nazwa-grupy"
        value={form.facebook}
        onChange={onChange}
        // simple URL hint (keeps native validation)
        pattern="https?://.*"
        aria-describedby={`${facebookId}-hint`}
      />

      <label className="formLabel" htmlFor={instagramId}>
        Instagram grupy lokalnej
      </label>
      <input
        className="formField"
        id={instagramId}
        name="instagram"
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://instagram.com/nazwa-grupy"
        value={form.instagram}
        onChange={onChange}
        pattern="https?://.*"
        aria-describedby={`${instagramId}-hint`}
      />


      <label className="formLabel" htmlFor={meetingsId}>
        Spotkania grupy lokalnej
      </label>
      <input
        className="formField"
        id={meetingsId}
        name="meetings"
        type="text"
        inputMode="text"
        autoComplete="off"
        placeholder="np. „Poniedziałki 18:00, ul. Przykładowa 1”"
        value={form.meetings}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={voivodeshipId}>
        Województwo <span aria-hidden="true">*</span>
      </label>
      <select
        className="formField"
        id={voivodeshipId}
        name="voivodeship"
        required
        value={form.voivodeship}
        onChange={onChange}
      >
        <option value="" disabled>
          Wybierz województwo…
        </option>
        {orderedVoivodeships.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <button
        className="formBtn"
        type="submit"
        disabled={submitting}
        aria-busy={submitting ? 'true' : 'false'}
      >
        {submitting ? 'Dodawanie…' : 'Dodaj miasto'}
      </button>
    </form>
  );
};

export default CityForm;
