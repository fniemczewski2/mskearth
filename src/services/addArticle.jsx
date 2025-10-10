import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';
import useUploadFiles from './useUploadFiles';

function ArticleForm({ currentUserName }) {
  const [articleId] = useState(uuid());

  const todayISODate = new Date().toISOString().split('T')[0]; 

  const statusId = useId();
  const titlePlId = useId();
  const subtitlePlId = useId();
  const contentPlId = useId();
  const titleEnId = useId();
  const subtitleEnId = useId();
  const contentEnId = useId();
  const titleUaId = useId();
  const subtitleUaId = useId();
  const contentUaId = useId();
  const imgAltId = useId();
  const publishedId = useId();
  const sourceLinkId = useId();
  const sourceTextId = useId();
  const fileId = useId();
  const [language, setLanguage] = useState('pl');

  const [pl, setPl] = useState({ title: '', subtitle: '', content: '' });
  const [en, setEn] = useState({ title: '', subtitle: '', content: '' });
  const [ua, setUa] = useState({ title: '', subtitle: '', content: '' });

  const [imgAlt, setImgAlt] = useState('');
  const [published, setPublished] = useState(todayISODate);
  const [sourceLink, setSourceLink] = useState('');
  const [sourceText, setSourceText] = useState('');

  const { fileIds, uploadFiles, uploadProgress, errors: uploadErrors, reset: resetUploads } = useUploadFiles('mskearth');

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const contentPlRef = useRef(null);
  const contentEnRef = useRef(null);
  const contentUaRef = useRef(null);

  const imageIndexes = Object.keys(uploadProgress).sort((a, b) => Number(a) - Number(b));

  const handleChange = (lang, field, value) => {
    const setMap = { pl: setPl, en: setEn, ua: setUa };
    setMap[lang]((prev) => ({ ...prev, [field]: value }));
  };

  const wrapSelection = (ref, startTag, endTag = startTag.replace('<', '</')) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    return `${before}${startTag}${selected}${endTag}>${after}`;
  };

  const onFormat = (e, format, lang) => {
    e.preventDefault();
    const map = {
      pl: { ref: contentPlRef, set: (v) => handleChange('pl', 'content', v) },
      en: { ref: contentEnRef, set: (v) => handleChange('en', 'content', v) },
      ua: { ref: contentUaRef, set: (v) => handleChange('ua', 'content', v) },
    };
    const target = map[lang];
    if (!target) return;

    if (format === 'link') {
      const el = target.ref.current;
      if (!el) return;
      const { selectionStart, selectionEnd, value } = el;
      const url = window.prompt('Podaj link (https://...)', 'https://');
      if (!url) return;
      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd) || 'link';
      const after = value.slice(selectionEnd);
      target.set(`${before}<a href="${url}" target="_blank" rel="nofollow noopener">${selected}</a>${after}`);
      return;
    }

    const tag = format === 'bold' ? 'b' : format === 'italic' ? 'em' : 'u';
    const next = wrapSelection(target.ref, `<${tag}>`);
    if (next) target.set(next);
  };

  const canSubmit =
    !submitting &&
    pl.title.trim().length > 0 &&
    pl.content.trim().length > 0 &&
    published.length > 0 &&
    fileIds.length <= 10;

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Trwa zapisywanie…' });

    const newRow = {
      id: articleId,
      title: pl.title.trim(),
      subtitle: pl.subtitle.trim() || null,
      content: pl.content.trim(),
      titleen: en.title.trim() || null,
      subtitleen: en.subtitle.trim() || null,
      contenten: en.content.trim() || null,
      titleua: ua.title.trim() || null,
      subtitleua: ua.subtitle.trim() || null,
      contentua: ua.content.trim() || null,
      imgurl: fileIds,
      imgalt: imgAlt.trim() || null,
      author: currentUserName || null,
      published: published ? new Date(published).toISOString() : null, 
      sourcelink: sourceLink.trim() || null,
      sourcetext: sourceText.trim() || null,
    };

    try {
      const { error } = await supabase.from('articles').insert(newRow);
      if (error) throw error;

      setStatus({ type: 'success', message: 'Dodano pomyślnie.' });
      setPl({ title: '', subtitle: '', content: '' });
      setEn({ title: '', subtitle: '', content: '' });
      setUa({ title: '', subtitle: '', content: '' });
      setImgAlt('');
      setSourceLink('');
      setSourceText('');
      resetUploads();
    } catch (err) {
      console.error('Insert error:', err);
      setStatus({ type: 'error', message: 'Wystąpił błąd podczas zapisu. Spróbuj ponownie.' });
    } finally {
      setSubmitting(false);
    }
  }

  const onFilesChosen = async (evt) => {
    const files = Array.from(evt.target.files || []);
    if (files.length === 0) return;
    if (files.length + fileIds.length > 10) {
      setStatus({ type: 'error', message: 'Możesz dodać maksymalnie 10 plików.' });
      return;
    }
    await uploadFiles(files, {
      bucket: 'mskearth',
      prefix: `articles/${articleId}`,
      maxFiles: 10,
    });
  };

  useEffect(() => {
    if (uploadErrors?.length) {
      setStatus({ type: 'error', message: uploadErrors[0].message || 'Błąd uploadu.' });
    }
  }, [uploadErrors]);

  return (
    <form className="addDataForm" onSubmit={onSubmit} noValidate aria-describedby={status.message ? statusId : undefined}>
      <h3 className="formHeader">Dodaj artykuł</h3>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`formStatus ${status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''}`}
      >
        {status.message}
      </p>

      {/* Language Switcher */}
      <div className="languageSwitcher" role="tablist" aria-label="Wersja językowa">
        <button type="button" role="tab" aria-selected={language === 'pl'} onClick={() => setLanguage('pl')} disabled={language === 'pl'}>Polski</button>
        <button type="button" role="tab" aria-selected={language === 'en'} onClick={() => setLanguage('en')} disabled={language === 'en'}>English</button>
        <button type="button" role="tab" aria-selected={language === 'ua'} onClick={() => setLanguage('ua')} disabled={language === 'ua'}>Українська</button>
      </div>

      {/* POLISH */}
      {language === 'pl' && (
        <>
          <label className="formLabel" htmlFor={titlePlId}>Tytuł (PL) <span aria-hidden="true">*</span></label>
          <input
            id={titlePlId}
            className="formField"
            type="text"
            placeholder="max. 24 znaki"
            value={pl.title}
            onChange={(e) => handleChange('pl', 'title', e.target.value)}
            maxLength={24}
            required
          />
          <label className="formLabel" htmlFor={subtitlePlId}>Podtytuł (PL)</label>
          <input
            id={subtitlePlId}
            className="formField"
            type="text"
            placeholder="max. 36 znaków"
            value={pl.subtitle}
            onChange={(e) => handleChange('pl', 'subtitle', e.target.value)}
            maxLength={36}
          />
          <label className="formLabel" htmlFor={contentPlId}>Treść (PL) <span aria-hidden="true">*</span></label>
          <div className="controls" aria-label="Formatowanie (PL)">
            <button type="button" onClick={(e) => onFormat(e, 'bold', 'pl')} title="Pogrubienie"><i className="bi bi-type-bold" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'italic', 'pl')} title="Kursywa"><i className="bi bi-type-italic" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'underline', 'pl')} title="Podkreślenie"><i className="bi bi-type-underline" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'link', 'pl')} title="Link"><i className="bi bi-link-45deg" /></button>
          </div>
          <textarea
            id={contentPlId}
            className="formField"
            placeholder="Wpisz treść artykułu"
            value={pl.content}
            onChange={(e) => handleChange('pl', 'content', e.target.value)}
            ref={contentPlRef}
            rows={6}
            required
          />
        </>
      )}

      {/* ENGLISH */}
      {language === 'en' && (
        <>
          <label className="formLabel" htmlFor={titleEnId}>Title (EN)</label>
          <input
            id={titleEnId}
            className="formField"
            type="text"
            placeholder="max. 24 characters"
            value={en.title}
            onChange={(e) => handleChange('en', 'title', e.target.value)}
            maxLength={24}
          />
          <label className="formLabel" htmlFor={subtitleEnId}>Subtitle (EN)</label>
          <input
            id={subtitleEnId}
            className="formField"
            type="text"
            placeholder="max. 36 characters"
            value={en.subtitle}
            onChange={(e) => handleChange('en', 'subtitle', e.target.value)}
            maxLength={36}
          />
          <label className="formLabel" htmlFor={contentEnId}>Content (EN)</label>
          <div className="controls" aria-label="Formatting (EN)">
            <button type="button" onClick={(e) => onFormat(e, 'bold', 'en')} title="Bold"><i className="bi bi-type-bold" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'italic', 'en')} title="Italic"><i className="bi bi-type-italic" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'underline', 'en')} title="Underline"><i className="bi bi-type-underline" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'link', 'en')} title="Link"><i className="bi bi-link-45deg" /></button>
          </div>
          <textarea
            id={contentEnId}
            className="formField"
            placeholder="Enter article body"
            value={en.content}
            onChange={(e) => handleChange('en', 'content', e.target.value)}
            ref={contentEnRef}
            rows={6}
          />
        </>
      )}

      {/* UKRAINIAN */}
      {language === 'ua' && (
        <>
          <label className="formLabel" htmlFor={titleUaId}>Заголовок (UA)</label>
          <input
            id={titleUaId}
            className="formField"
            type="text"
            placeholder="макс. 24 символи"
            value={ua.title}
            onChange={(e) => handleChange('ua', 'title', e.target.value)}
            maxLength={24}
          />
          <label className="formLabel" htmlFor={subtitleUaId}>Підзаголовок (UA)</label>
          <input
            id={subtitleUaId}
            className="formField"
            type="text"
            placeholder="макс. 36 символів"
            value={ua.subtitle}
            onChange={(e) => handleChange('ua', 'subtitle', e.target.value)}
            maxLength={36}
          />
          <label className="formLabel" htmlFor={contentUaId}>Текст (UA)</label>
          <div className="controls" aria-label="Форматування (UA)">
            <button type="button" onClick={(e) => onFormat(e, 'bold', 'ua')} title="Жирний"><i className="bi bi-type-bold" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'italic', 'ua')} title="Курсив"><i className="bi bi-type-italic" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'underline', 'ua')} title="Підкреслення"><i className="bi bi-type-underline" /></button>
            <button type="button" onClick={(e) => onFormat(e, 'link', 'ua')} title="Посилання"><i className="bi bi-link-45deg" /></button>
          </div>
          <textarea
            id={contentUaId}
            className="formField"
            placeholder="Введіть текст статті"
            value={ua.content}
            onChange={(e) => handleChange('ua', 'content', e.target.value)}
            ref={contentUaRef}
            rows={6}
          />
        </>
      )}

      {/* Image alt */}
      <label className="formLabel" htmlFor={imgAltId}>Tekst alternatywny obrazu</label>
      <input
        id={imgAltId}
        className="formField"
        type="text"
        placeholder="Opisz obraz (dla czytników ekranu)"
        value={imgAlt}
        onChange={(e) => setImgAlt(e.target.value)}
      />

      {/* Images */}
      <label className="formLabel" htmlFor={fileId}>Dodaj zdjęcia (max. 10)</label>
      <input
        id={fileId}
        className="formField"
        type="file"
        accept="image/*"
        multiple
        onChange={onFilesChosen}
      />
      {imageIndexes.length > 0 && (
        <div className="uploadList" aria-live="polite">
          {imageIndexes.map((idx) => (
            <div key={idx}>
              <span>Obraz {Number(idx) + 1}: {uploadProgress[idx] ?? 0}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Meta */}
      <label className="formLabel" htmlFor={publishedId}>Data publikacji</label>
      <input
        id={publishedId}
        className="formField"
        type="date"
        value={published}
        onChange={(e) => setPublished(e.target.value)}
        required
      />

      <label className="formLabel" htmlFor={sourceLinkId}>Link źródła</label>
      <input
        id={sourceLinkId}
        className="formField"
        type="url"
        inputMode="url"
        placeholder="https://example.com"
        value={sourceLink}
        onChange={(e) => setSourceLink(e.target.value)}
        pattern="https?://.*"
      />

      <label className="formLabel" htmlFor={sourceTextId}>Nazwa źródła</label>
      <input
        id={sourceTextId}
        className="formField"
        type="text"
        placeholder="np. Gazeta Wyborcza"
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
      />

      <button type="submit" className="submitFormButton" disabled={!canSubmit} aria-busy={submitting ? 'true' : 'false'}>
        {submitting ? 'Dodawanie…' : 'Dodaj'}
      </button>
    </form>
  );
}

ArticleForm.propTypes = {
  currentUserName: PropTypes.string, 
};

export default ArticleForm;
