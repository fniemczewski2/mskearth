import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const LOCALE_CACHE = new Map();

export default function JoinUs() {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [t, setT] = useState({ joinUs: {} });

  const [calls, setCalls] = useState([]);
  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
        console.error('JoinUs i18n error:', e);
        if (active) setT({ joinUs: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data: recData, error: recErr } = await supabase
          .from('recruitments')
          .select('id, instagram, form')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (recErr) throw recErr;

        const { data: callData, error: callErr } = await supabase
          .from('recruitment_calls')
          .select('id, date, time, link') 
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        if (callErr) throw callErr;

        if (!active) return;
        setRecruitment(recData || null);
        setCalls(Array.isArray(callData) ? callData : []);
      } catch (e) {
        console.error('JoinUs fetch error:', e);
        if (active) setErr('Nie udało się wczytać danych rekrutacyjnych.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);


  const toLocalDate = (d, t) => {
    if (!d) return null;
    const timeStr = (t || '00:00').toString();
    const hhmm = /^\d{2}:\d{2}$/.test(timeStr)
      ? timeStr
      : (/^\d{2}:\d{2}:\d{2}$/.test(timeStr) ? timeStr.slice(0, 5) : '00:00');
    const dt = new Date(`${d}T${hhmm}`);
    return isNaN(dt.getTime()) ? null : dt; 
  };

  const nearest = useMemo(() => {
    const now = new Date();
    const upcoming = calls
      .map(c => ({ ...c, when: toLocalDate(c.date, c.time) }))
      .filter(c => c.when && c.when > now)
      .sort((a, b) => a.when - b.when);
    return upcoming[0] || null;
  }, [calls]);

  const locale = language === 'pl' ? 'pl-PL' : language;
  const formatDate = (d) => {
    if (!d) return '';
    try {
      return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return d.toLocaleDateString('pl-PL');
    }
  };
  const formatTime = (d) => (d ? d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <>
      <h2>{t.joinUs?.h2 || 'Dołącz do nas'}</h2>

      <aside id="joinUs" className="joinUs" aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
            <span className="spinner" aria-hidden="true"/>
          </div>
        )}

        {!loading && err && <p role="alert">{err}</p>}

        {!loading && !err && (
          <ul>
            {/* Instagram */}
            <li className="joinUsActionContainer">
              <div className="joinUsAction heading">
                <p className="joinUsActionHeader">
                  <i className="bi bi-instagram joinUsIcon" aria-hidden="true"></i>
                  {t.joinUs?.follow || 'Obserwuj'}&nbsp;
                </p>
              </div>
              <div className="joinUsAction data">
                <p className="joinUsActionDetails">@msk_dolacz</p>
                {recruitment?.instagram && (
                  <a
                    className="joinUsButton"
                    href={recruitment.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                  </a>
                )}
              </div>
            </li>

            {recruitment?.form && (
              <li className="joinUsActionContainer">
                <div className="joinUsAction">
                  <p className="joinUsActionHeader">
                    <i className="bi bi-pencil-square joinUsIcon" aria-hidden="true"></i>
                    {t.joinUs?.filloutForm || 'Wypełnij formularz'}
                  </p>
                  <a
                    className="joinUsButton"
                    href={recruitment.form}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                  </a>
                </div>
              </li>
            )}

            {nearest && (
              <li className="joinUsActionContainer">
                <div className="joinUsAction heading">
                  <p className="joinUsActionHeader">
                    <i className="bi bi-person-video3 joinUsIcon" aria-hidden="true"></i>
                    {t.joinUs?.meeting || 'Spotkanie online'}&nbsp;
                  </p>
                </div>
                <div className="joinUsAction data">
                  <p className="joinUsActionDetails">
                    {formatDate(nearest.when)} {t.joinUs?.h || 'o'}&nbsp;{formatTime(nearest.when)}
                  </p>
                  {nearest.link && (
                    <a
                      className="joinUsButton"
                      target="_blank"
                      href={nearest.link}
                      rel="noopener nofollow"
                    >
                      Link&nbsp;<i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                    </a>
                  )}
                </div>
              </li>
            )}

            {/* Cities */}
            <li className="joinUsActionContainer">
              <div className="joinUsAction">
                <p className="joinUsActionHeader">
                  <i className="bi bi-geo-alt joinUsIcon" aria-hidden="true"></i>
                  {t.joinUs?.find || 'Znajdź swoją grupę'}
                </p>
                <Link className="joinUsButton" to={`/${language}/miasta`}>
                  {t.joinUs?.check || 'Sprawdź'}&nbsp;<i className="bi bi-search" aria-hidden="true"></i>
                </Link>
              </div>
            </li>
          </ul>
        )}
      </aside>
    </>
  );
}
