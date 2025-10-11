import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const LOCALE_CACHE = new Map();
const STORAGE_BUCKET = 'mskearth';

export default function Foundation() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ foundation: {} });

  const [financialReports, setFinancialReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsErr, setReportsErr] = useState('');

  const [board, setBoard] = useState([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardErr, setBoardErr] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setT(LOCALE_CACHE.get(language));
        } else {
          const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          LOCALE_CACHE.set(language, data);
          if (active) setT(data);
        }
      } catch (e) {
        console.error('Error loading translations:', e);
        if (active) setT({ foundation: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);


  const publicUrl = (path, bucket = STORAGE_BUCKET) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setReportsLoading(true); setReportsErr('');
      try {
        const { data, error } = await supabase
          .from('financial_reports')
          .select('id, year, file_path')
          .order('year', { ascending: false });
        if (error) throw error;
        const items = (data || []).map(r => ({
          id: r.id,
          year: r.year,
          file_path: publicUrl(r.file_path),
        }));
        if (active) setFinancialReports(items);
      } catch (e) {
        console.error('financial_reports error:', e);
        if (active) setReportsErr('Nie udało się wczytać sprawozdań.');
      } finally {
        if (active) setReportsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setBoardLoading(true); setBoardErr('');
      try {
        const { data, error } = await supabase
          .from('foundation_board_members')
          .select('id, name, role, role_en, role_ua, phone, email, img_path, description, description_en, description_ua')
          .order('name', { ascending: true });
        if (error) throw error;

        const localized = (base, en, ua) => {
          if (language === 'en') return en || base || '';
          if (language === 'ua') return ua || base || '';
          return base || '';
        };

        const items = (data || []).map(m => ({
          id: m.id,
          name: m.name,
          role: localized(m.role, m.role_en, m.role_ua),
          description: localized(m.description, m.description_en, m.description_ua),
          phone: m.phone,
          email: m.email,
          img_path: publicUrl(m.img_path),
        }));

        if (active) setBoard(items);
      } catch (e) {
        console.error('board error:', e);
        if (active) setBoardErr('Nie udało się wczytać składu zarządu.');
      } finally {
        if (active) setBoardLoading(false);
      }
    })();
    return () => { active = false; };
  }, [language]); 

  const h1 = ['Fundacja Przyjaciół', 'Młodzieżowego Strajku Klimatycznego'];
  const h4 = ['Adres: ', 'KRS: ', 'NIP: ', 'REGON:', 'Telefon: ', 'Email: ', 'Numer\u00A0konta:  '];

  return (
    <main className="foundation">
      <h1>{h1[0]}<br />{h1[1]}</h1>

      <article className="foundationContactData">
        <div className="foundationData">
          <div className="foundationDataElement">
            <h4>{t.foundation.address || 'Adres:'}</h4>
            <p>Smolnik 77, 59&shy;-820&nbsp;Leśna</p>
          </div>
          <div className="foundationDataElement">
            <h4>{h4[1]}</h4>
            <p>0000915501</p>
          </div>
          <div className="foundationDataElement">
            <h4>{h4[2]}</h4>
            <p>522&nbsp;32&nbsp;08&nbsp;326</p>
          </div>
          <div className="foundationDataElement">
            <h4>{h4[3]}</h4>
            <p>389763794</p>
          </div>
          <div className="foundationDataElement">
            <h4>{t.foundation.phone || 'Telefon:'}</h4>
            <p><a className='mailto' href="tel:+48697302674">+48&nbsp;697&nbsp;302&nbsp;674</a></p>
          </div>
          <div className="foundationDataElement">
            <h4>{h4[5]}</h4>
            <p><a className='mailto' href="mailto:fundacja@msk.earth">fundacja@msk.earth</a></p>
          </div>
          <div className="foundationDataElement">
            <h4>{t.foundation.bank || 'Numer konta:'}</h4>
            <p className="bankAccountNumber">63&nbsp;1600&nbsp;1462&nbsp;1855&nbsp;8899&nbsp;4000&nbsp;0001</p>
          </div>
        </div>
        <div className="foundationLogoContainer">
          <img
            className="foundationLogo"
            src="/logoFPMSK.png"
            alt="Logo Fundacji Przyjaciół Młodzieżowego Strajku Klimatycznego"
            loading="lazy"
            decoding="async"
          />
        </div>
      </article>

      <section className="documentsContainer">
        <h2>{t.foundation.documents || 'Dokumenty'}</h2>

        <article className="reports">
          <h3 className="reportsTitle">{t.foundation.financialReports || 'Sprawozdania finansowe'}</h3>
          <div className="reportsContainer" aria-busy={reportsLoading ? 'true' : 'false'}>
            {reportsLoading && (
              <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
                <span className="spinner" aria-hidden="true"/>
              </div>
            )}
            {!reportsLoading && reportsErr && <p role="alert">{reportsErr}</p>}
            {!reportsLoading && !reportsErr && financialReports.length > 0 && (
              financialReports.map((r) => (
                <a
                  className="report"
                  key={r.id || r.year}
                  href={r.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Pobierz sprawozdanie finansowe ${r.year}`}
                >
                  {r.year}&nbsp;<i className="bi bi-download" aria-hidden="true" />
                </a>
              ))
            )}
          </div>
        </article>

        <article>
          <h3>{t.foundation.statut || 'Statut'}</h3>
          <a
            className="statut"
            href="/statut.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pobierz statut (PDF)"
          >
            Pobierz&nbsp;<i className="bi bi-download" aria-hidden="true" />
          </a>
        </article>
        <article>
          <h3>{t.foundation.polityka || 'Polityka ochrony dzieci przed skrzywdzeniem'}</h3>
          <a
            className="statut"
            href="/podpk.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pobierz politykę ochrony dzieci przed skrzywdzeniem (PDF)"
          >
            Pobierz&nbsp;<i className="bi bi-download" aria-hidden="true" />
          </a>
        </article>
      </section>

      <section className="boardContainer" aria-busy={boardLoading ? 'true' : 'false'}>
        <h2>{t.foundation.board || 'Zarząd'}</h2>

        {boardLoading && (
          <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
            <span className="spinner" aria-hidden="true"/>
          </div>
        )}
        {!boardLoading && boardErr && <p role="alert">{boardErr}</p>}

        {!boardLoading && !boardErr && board.map((m) => (
          <article key={m.id} className="boardMember">
            {m.img_path && (
              <img
                src={m.img_path}
                alt={`Zdjęcie: ${m.name}`}
                loading="lazy"
                decoding="async"
              />
            )}
            <h3 className="boardMemberName">{m.name}</h3>
            {m.role && <h4>{m.role}</h4>}

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
