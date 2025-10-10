const initialForm = {
  name: '',
  email: '',
  phone: '',
  cityId: '',
};

function isSubmitDisabled({ name, email, phone, cityId }) {
  return !name.trim() || !email.trim() || !phone.trim() || !cityId;
}

function normalizePhone(v) {
  return (v || '').replace(/\s+/g, '').trim();
}

const ContactPersonForm = () => {
  const [form, setForm] = useState(initialForm);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const cityId = useId();
  const statusId = useId();

  useEffect(() => {
    refreshCities();
  }, []);

  async function refreshCities() {
    setLoadingCities(true);
    setStatus({ type: 'loading', message: 'Ładowanie…' });
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name');
      if (error) throw error;

      const ordered = (data || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
      setCities(ordered);
      setStatus({ type: 'idle', message: ordered.length ? '' : 'Brak miast do wyboru.' });

      setForm((prev) =>
        ordered.some((c) => c.id === prev.cityId) ? prev : { ...prev, cityId: '' }
      );
    } catch (err) {
      console.error('Błąd pobierania miast:', err);
      setStatus({ type: 'error', message: 'Nie udało się pobrać listy miast.' });
    } finally {
      setLoadingCities(false);
    }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const selectedCity = cities.find((c) => String(c.id) === String(form.cityId));
    const cityName = selectedCity?.name || '';

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: normalizePhone(form.phone),
      city: cityName,
    };

    try {
      const { error } = await supabase.from('contact_people').insert(payload);
      if (error) throw error;

      setForm(initialForm);
      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
    } catch (err) {
      console.error('Error:', err);
      setStatus({
        type: 'error',
        message: 'Wystąpił błąd podczas zapisu. Spróbuj ponownie.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isDisabled = useMemo(() => isSubmitDisabled(form), [form]);

  return (
    <form
      className="addDataForm"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={status.message ? statusId : undefined}
    >
      <h3 className="formHeader">Osoba kontaktowa</h3>

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
        Imię i nazwisko <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={nameId}
        name="name"
        type="text"
        required
        autoComplete="name"
        value={form.name}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={emailId}>
        Email <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={emailId}
        name="email"
        type="email"
        required
        inputMode="email"
        autoComplete="email"
        value={form.email}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={phoneId}>
        Telefon <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={phoneId}
        name="phone"
        type="tel"
        required
        inputMode="tel"
        autoComplete="tel"
        placeholder="+48 123 456 789"
        value={form.phone}
        onChange={onChange}
        pattern="^(\+?\d{1,3})?[\s\-]?\d{2,3}([\s\-]?\d{2,3}){2,3}$"
        aria-describedby={`${phoneId}-hint`}
      />

      <label className="formLabel" htmlFor={cityId}>
        Miasto <span aria-hidden="true">*</span>
      </label>
      <div className="selectCityContainer">
        <select
          className="formField selectCity"
          id={cityId}
          name="cityId"
          required
          value={form.cityId}            
          onChange={onChange}
          disabled={loadingCities}
        >
          <option value="" disabled>
            {loadingCities ? 'Ładowanie…' : 'Wybierz miasto…'}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="refreshBtn"
          type="button"
          onClick={refreshCities}
          aria-label="Odśwież listę miast"
          title="Odśwież listę miast"
          disabled={loadingCities}
        >
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
        </button>
      </div>

      <button
        className="formBtn"
        type="submit"
        disabled={submitting || isDisabled}
        aria-busy={submitting ? 'true' : 'false'}
      >
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
};

export default ContactPersonForm;
