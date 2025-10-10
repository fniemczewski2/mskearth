import useUploadFiles from './useUploadFiles';

function FinancialReportForm({ currentUserName }) {
  const yearId = useId();
  const fileId = useId();
  const statusId = useId();
  const fileInputRef = useRef(null);

  const [year, setYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const {
    fileIds,           
    uploadFiles,       
    uploadProgress,   
    uploading,         
    errors,           
    reset,            
  } = useUploadFiles('mskearth');

  const firstPath = fileIds?.[0] || '';
  const progress0 = typeof uploadProgress?.[0] === 'number' ? uploadProgress[0] : 0;
  const uploadError = errors?.[0]?.message || '';

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (uploadError) {
      setStatus({ type: 'error', message: `Błąd uploadu: ${uploadError}` });
    }
  }, [uploadError]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const payload = {
      year: Number(year),
      file_path: firstPath,                     
      author: currentUserName || 'Nieznany',
    };

    try {
      const { error } = await supabase.from('financial_reports').insert(payload);
      if (error) throw error;

      setYear('');
      if (fileInputRef.current) fileInputRef.current.value = null;
      reset();

      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
    } catch (err) {
      console.error('Error:', err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu. Spróbuj ponownie.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    !uploading &&
    !!firstPath &&
    progress0 >= 100 &&
    /^\d{4}$/.test(year) &&
    Number(year) >= 1990 &&
    Number(year) <= currentYear + 1;

  const onChooseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setStatus({ type: 'error', message: 'Dozwolone są wyłącznie pliki PDF.' });
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    await uploadFiles([file], {
      bucket: 'mskearth',
      prefix: `financial-reports/${(year || 'unknown').toString().trim()}`,
      maxFiles: 1,
    });
  };

  return (
    <form
      className="addDataForm"
      onSubmit={onSubmit}
      noValidate
      aria-describedby={status.message ? statusId : undefined}
    >
      <h3 className="formHeader">Sprawozdanie finansowe</h3>

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

      <label className="formLabel" htmlFor={yearId}>
        Rok <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={yearId}
        name="year"
        type="number"
        inputMode="numeric"
        min="1990"
        max={String(currentYear + 1)}
        placeholder="YYYY"
        pattern="^\d{4}$"
        required
        value={year}
        onChange={(e) => setYear(e.target.value)}
        aria-describedby={`${yearId}-hint`}
      />
      <small id={`${yearId}-hint`} className="formHint">
        Podaj rok w formacie czterocyfrowym (np. {currentYear}).
      </small>

      <label className="formLabel" htmlFor={fileId}>
        Sprawozdanie finansowe (PDF) <span aria-hidden="true">*</span>
      </label>
      <input
        className="formField"
        id={fileId}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onChooseFile}
        ref={fileInputRef}
        aria-describedby={`${fileId}-hint ${fileId}-progress`}
      />
      <small id={`${fileId}-hint`} className="formHint">
        Dozwolone są wyłącznie pliki PDF.
      </small>

      <div id={`${fileId}-progress`} className="formHint" role="status" aria-live="polite">
        {uploading ? (
          <>Wysyłanie pliku… ({progress0}%)</>
        ) : firstPath ? (
          <>Plik przesłany. ({progress0}%)</>
        ) : progress0 > 0 ? (
          <>Przesyłanie przerwane.</>
        ) : (
          <>Nie wybrano pliku.</>
        )}
      </div>

      <button
        className="formBtn"
        type="submit"
        disabled={!canSubmit}
        aria-busy={submitting ? 'true' : 'false'}
      >
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
}

export default FinancialReportForm;
