import { useEffect, useState } from 'react';

import { supabase, toPublicUrl } from '../../services/supabaseClient';
import Seo from '../../shared/components/Seo.jsx';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

const STORAGE_BUCKET = 'mskearth';

export default function Foundation() {
  const { t, lang } = useTranslations();
  const f = t.foundation ?? {};
  const newTab = t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)';

  const [financialReports, setFinancialReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsErr, setReportsErr] = useState(false);

  const [boardRows, setBoardRows] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardErr, setBoardErr] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('financial_reports')
          .select('id, year, file_path')
          .not('file_path', 'is', null)
          .order('year', { ascending: false });
        if (error) throw error;
        const items = (data || []).map((r) => ({
          id: r.id,
          year: r.year,
          url: toPublicUrl(r.file_path, STORAGE_BUCKET),
        }));
        if (active) setFinancialReports(items.filter((r) => r.url));
      } catch (e) {
        console.error('financial_reports error:', e);
        if (active) setReportsErr(true);
      } finally {
        if (active) setReportsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('foundation_board_members')
          .select('id, name, role, role_en, phone, email, img_path, description, description_en')
          .order('name', { ascending: true });
        if (error) throw error;
        if (active) setBoardRows(data || []);
      } catch (e) {
        console.error('board error:', e);
        if (active) setBoardErr(true);
      } finally {
        if (active) setBoardLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const board = boardRows.map((m) => ({
    id: m.id,
    name: m.name,
    role: lang === 'en' ? m.role_en || m.role || '' : m.role || '',
    description: lang === 'en' ? m.description_en || m.description || '' : m.description || '',
    phone: m.phone,
    email: m.email,
    img: toPublicUrl(m.img_path, STORAGE_BUCKET),
  }));

  const h1 = Array.isArray(f.h1) ? f.h1 : ['Fundacja Przyjaciół', 'Młodzieżowego Strajku Klimatycznego'];

  const loader = (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{t.a11y?.loading ?? 'Ładowanie…'}</span>
    </div>
  );

  return (
    <main className="foundation">
      <Seo
        title={t.seo?.foundation?.title ?? 'Fundacja Przyjaciół MSK – dokumenty i zarząd'}
        description={t.seo?.foundation?.description}
        url={`${SITE_URL}/${lang}/fundacja`}
      />
      <div className="page-intro">
        <h1>
          {h1[0]}
          <br />
          {h1[1]}
        </h1>
        <span className="section-divider" aria-hidden="true" />
      </div>

      <article className="foundationContactData">
        <dl className="foundationData">
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.address || 'Adres:'}</dt>
            <dd>Smolnik 77, 59&#8209;820&nbsp;Leśna</dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.krs || 'KRS:'}</dt>
            <dd>0000915501</dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.nip || 'NIP:'}</dt>
            <dd>522&nbsp;32&nbsp;08&nbsp;326</dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.regon || 'REGON:'}</dt>
            <dd>389763794</dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.phone || 'Telefon:'}</dt>
            <dd><a className="mailto" href="tel:+48697302674">+48&nbsp;697&nbsp;302&nbsp;674</a></dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.email || 'E-mail:'}</dt>
            <dd><a className="mailto" href="mailto:fundacja@msk.earth">fundacja@msk.earth</a></dd>
          </div>
          <div className="foundationDataElement">
            <dt className="foundationLabel">{f.bank || 'Numer konta:'}</dt>
            <dd className="bankAccountNumber">63&nbsp;1600&nbsp;1462&nbsp;1855&nbsp;8899&nbsp;4000&nbsp;0001</dd>
          </div>
        </dl>
        <div className="foundationLogoContainer">
          <img
            className="foundationLogo"
            src="/logoFPMSK.png"
            alt={f.logoAlt ?? 'Logo Fundacji Przyjaciół Młodzieżowego Strajku Klimatycznego'}
            loading="lazy"
            decoding="async"
          />
        </div>
      </article>

      <section className="documentsContainer" data-reveal>
        <h2>{f.documents || 'Dokumenty'}</h2>

        <article className="reports">
          <h3 className="reportsTitle">{f.financialReports || 'Sprawozdania finansowe'}</h3>
          <div className="reportsContainer" aria-busy={reportsLoading ? 'true' : 'false'}>
            {reportsLoading && loader}
            {!reportsLoading && reportsErr && (
              <p role="alert">{f.loadReportsError ?? 'Nie udało się wczytać sprawozdań.'}</p>
            )}
            {!reportsLoading &&
              !reportsErr &&
              financialReports.map((r) => (
                <a className="report" key={r.id || r.year} href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.year}
                  <span className="sr-only">
                    {' '}
                    {format(f.downloadReport ?? 'Pobierz sprawozdanie finansowe za {year} (PDF)', { year: r.year })}{' '}
                    {newTab}
                  </span>
                  &nbsp;<i className="bi bi-download" aria-hidden="true" />
                </a>
              ))}
          </div>
        </article>

        <article>
          <h3>{f.statut || 'Statut'}</h3>
          <a className="statut" href="/statut.pdf" target="_blank" rel="noopener noreferrer">
            {f.download ?? 'Pobierz'}
            <span className="sr-only">
              {' '}
              {f.downloadStatute ?? 'statut (PDF)'} {newTab}
            </span>
            &nbsp;<i className="bi bi-download" aria-hidden="true" />
          </a>
        </article>
        <article>
          <h3>{f.childProtection || 'Polityka ochrony dzieci przed krzywdzeniem'}</h3>
          <a className="statut" href="/podpk.pdf" target="_blank" rel="noopener noreferrer">
            {f.download ?? 'Pobierz'}
            <span className="sr-only">
              {' '}
              {f.downloadChildPolicy ?? 'politykę ochrony dzieci (PDF)'} {newTab}
            </span>
            &nbsp;<i className="bi bi-download" aria-hidden="true" />
          </a>
        </article>
      </section>

      <section className="boardContainer" data-reveal aria-busy={boardLoading ? 'true' : 'false'}>
        <h2>{f.board || 'Zarząd'}</h2>

        {boardLoading && loader}
        {!boardLoading && boardErr && <p role="alert">{f.loadBoardError ?? 'Nie udało się wczytać składu zarządu.'}</p>}

        {!boardLoading &&
          !boardErr &&
          board.map((m) => (
            <article key={m.id} className="boardMember">
              {m.img && (
                <img
                  src={m.img}
                  alt={format(f.photo ?? 'Zdjęcie: {name}', { name: m.name })}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <h3 className="boardMemberName">{m.name}</h3>
              {m.role && <p className="boardMemberRole">{m.role}</p>}

              <div className="boardContacts">
                {m.phone && (
                  <strong>
                    <i className="bi bi-telephone-fill" aria-hidden="true" />&nbsp;
                    <a href={`tel:${String(m.phone).replace(/\s+/g, '')}`}>{m.phone}</a>
                  </strong>
                )}
                {m.email && (
                  <strong>
                    <i className="bi bi-envelope-fill" aria-hidden="true" />&nbsp;
                    <a href={`mailto:${m.email}`}>{m.email}</a>
                  </strong>
                )}
              </div>

              {m.description && <p className="description">{m.description}</p>}
            </article>
          ))}
      </section>
    </main>
  );
}
