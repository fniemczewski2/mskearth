const LocalContactPersonForm = () => {
  // a11y ids
  const nameId = useId();
  const facebookId = useId();
  const emailId = useId();
  const phoneId = useId();
  const cityId = useId();
  const statusId = useId();

  // form state
  const [name, setName] = useState('');
  const [facebook, setFacebook] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(''); // store city name (matches your original schema)

  // data + UI state
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  // helpers
  const normalizeUrlOrNull = (v) => {
    const s = (v || '').trim();
    if (!s) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  };

  const orderedCities = useMemo(
    () => [...cities].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl')),
    [cities]
  );

  async function fetchCities() {
    setLoadingCities(true);
    setStatus({ type: 'loading', message: 'Ładowanie…' });
    try {
      const { data, error } = await supabase.from('cities').select('id, name');
      if (error) throw error;
      setCities(data || []);
      setStatus({ type: 'idle', message: '' });
      // keep selected value if it still exists
      if (data && !data.some((c) => c.name === city)) setCity('');
    } catch (err) {
      console.error('Błąd pobierania miast:', err);
      setStatus({ type: 'error', message: 'Nie udało się pobrać listy miast.' });
    } finally {
      setLoadingCities(false);
    }
  }

  useEffect(() => {
    fetchCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const payload = {
      name: name.trim(),
      facebook: normalizeUrlOrNull(facebook),
      email: email.trim() || null,
      phone: phone.trim() || null,
      city, 
    };

    try {
      const { error } = await supabase.from('local_contact_people').insert(payload);
      if (error) throw error;

      setName('');
      setFacebook('');
      setEmail('');
      setPhone('');
      setCity('');
      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
    } catch (err) {
      console.error('Error:', err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu. Spróbuj ponownie.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim() && city && !submitting;

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
          status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''
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
        type="text"
        required
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="formLabel" htmlFor={facebookId}>Facebook (osoby)</label>
      <input
        className="formField"
        id={facebookId}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://facebook.com/…"
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
        pattern="https?://.*"
        aria-describedby={`${facebookId}-hint`}
      />

      <label className="formLabel" htmlFor={emailId}>Email</label>
      <input
        className="formField"
        id={emailId}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="imię.nazwisko@example.com"
      />

      <label className="formLabel" htmlFor={phoneId}>Telefon</label>
      <input
        className="formField"
        id={phoneId}
        type="tel"
        inputMode="tel"
        placeholder="+48 123 456 789"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
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
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={loadingCities}
        >
          <option value="" disabled>
            {loadingCities ? 'Ładowanie…' : 'Wybierz miasto…'}
          </option>
          {orderedCities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="refreshBtn"
          type="button"
          onClick={fetchCities}
          aria-label="Odśwież listę miast"
          title="Odśwież listę miast"
          disabled={loadingCities}
        >
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
        </button>
      </div>

      <button className="formBtn" type="submit" disabled={!canSubmit} aria-busy={submitting ? 'true' : 'false'}>
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
};

export default LocalContactPersonForm;
