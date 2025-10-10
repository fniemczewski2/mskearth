import useUploadFiles from './useUploadFiles';

const BUCKET = 'mskearth';         
const FOUNDATION_PREFIX = 'foundation';

const initialForm = {
  name: '',
  role: '',
  role_en: '',
  role_ua: '',
  description: '',
  description_en: '',
  description_ua: '',
  phone: '',
  email: '',
};

function FoundationBoardForm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [previewUrl, setPreviewUrl] = useState('');

  const nameId = useId();
  const roleId = useId();
  const roleEnId = useId();
  const roleUaId = useId();
  const descriptionId = useId();
  const descriptionEnId = useId();
  const descriptionUaId = useId();
  const phoneId = useId();
  const emailId = useId();
  const photoId = useId();
  const statusId = useId();

  const fileInputRef = useRef(null);

  const {
    fileIds,
    uploadFiles,
    uploadProgress,
    uploading,
    errors,
    reset,
  } = useUploadFiles(BUCKET);

  const firstPath = fileIds?.[0] || '';
  const firstProgress = uploadProgress?.[0]; 
  const firstUploadError = errors?.[0]?.message;

  useEffect(() => {
    if (!firstPath) {
      setPreviewUrl('');
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(firstPath);
    setPreviewUrl(data?.publicUrl || '');
  }, [firstPath]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const payload = {
      name: (form.name || '').trim(),
      role: (form.role || '').trim(),
      role_en: (form.role_en || '').trim() || null,
      role_ua: (form.role_ua || '').trim() || null,
      description: (form.description || '').trim(),
      description_en: (form.description_en || '').trim() || null,
      description_ua: (form.description_ua || '').trim() || null,
      phone: (form.phone || '').trim() || null,
      email: (form.email || '').trim() || null,
      img_path: firstPath || null, 
    };

    try {
      const { error } = await supabase.from('foundation_board_members').insert(payload);
      if (error) throw error;

      setForm(initialForm);
      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });

      if (fileInputRef.current) fileInputRef.current.value = null;
      reset();
      setPreviewUrl('');
    } catch (err) {
      console.error('Error: ', err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu. Spróbuj ponownie.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    (form.name || '').trim().length > 0 &&
    (form.role || '').trim().length > 0 &&
    !!firstPath &&
    Number(firstProgress ?? 0) >= 100;

  const uploadStatusText = firstUploadError
    ? `Błąd uploadu: ${firstUploadError}`
    : uploading
    ? 'Wysyłanie pliku…'
    : typeof firstProgress === 'number'
    ? `Plik przesłany. (${firstProgress}%)`
    : 'Nie wybrano pliku.';

  return (
    <form
      className="addDataForm"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={status.message ? statusId : undefined}
    >
      <h3 className="formHeader">Zarząd fundacji</h3>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`formStatus ${
          status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''
        }`}
      >
        {status.message || firstUploadError || ''}
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

      <label className="formLabel" htmlFor={roleId}>
        Funkcja <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={roleId}
        name="role"
        type="text"
        required
        value={form.role}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={roleEnId}>Funkcja (angielski)</label>
      <input
        className="formField"
        id={roleEnId}
        name="role_en"
        type="text"
        value={form.role_en}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={roleUaId}>Funkcja (ukraiński)</label>
      <input
        className="formField"
        id={roleUaId}
        name="role_ua"
        type="text"
        value={form.role_ua}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={descriptionId}>Opis <span aria-hidden="true">*</span></label>
      <textarea
        className="formField"
        id={descriptionId}
        name="description"
        rows={4}
        required
        value={form.description}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={descriptionEnId}>Opis (angielski)</label>
      <textarea
        className="formField"
        id={descriptionEnId}
        name="description_en"
        rows={4}
        value={form.description_en}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={descriptionUaId}>Opis (ukraiński)</label>
      <textarea
        className="formField"
        id={descriptionUaId}
        name="description_ua"
        rows={4}
        value={form.description_ua}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={phoneId}>Telefon</label>
      <input
        className="formField"
        id={phoneId}
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="+48 123 456 789"
        value={form.phone}
        onChange={onChange}
        pattern="^(\+?\d{1,3})?[\s\-]?\d{2,3}([\s\-]?\d{2,3}){2,3}$"
        aria-describedby={`${phoneId}-hint`}
      />

      <label className="formLabel" htmlFor={emailId}>Email</label>
      <input
        className="formField"
        id={emailId}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="imie.nazwisko@msk.earth"
        value={form.email}
        onChange={onChange}
      />

      <label className="formLabel" htmlFor={photoId}>
        Zdjęcie <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={photoId}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            uploadFiles([f], { bucket: BUCKET, prefix: FOUNDATION_PREFIX, maxFiles: 1 });
          }
        }}
        ref={fileInputRef}
        aria-describedby={`${photoId}-hint ${photoId}-progress`}
      />
      <small id={`${photoId}-hint`} className="formHint">
        Wgraj zdjęcie członka/członkini zarządu.
      </small>

      {previewUrl && (
        <div className="formPreview" style={{ marginTop: 8 }}>
          <img
            src={previewUrl}
            alt={form.name ? `Podgląd zdjęcia: ${form.name}` : 'Podgląd zdjęcia'}
            width={160}
            height={160}
            style={{ objectFit: 'cover', borderRadius: 8 }}
            loading="lazy"
          />
        </div>
      )}

      <div id={`${photoId}-progress`} className="formHint" role="status" aria-live="polite">
        {uploadStatusText}
      </div>

      <button
        className="formBtn"
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting ? 'true' : 'false'}
      >
        {submitting ? 'Dodawanie…' : 'Dodaj osobę'}
      </button>
    </form>
  );
}

export default FoundationBoardForm;
