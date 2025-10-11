import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import Cities from '../components/cities.jsx';
import { supabase } from '../services/supabaseClient.jsx';

const LOCALE_CACHE = new Map();

const DB_VOIVODESHIPS = [
  'dolnośląskie','kujawsko-pomorskie','lubelskie','lubuskie','łódzkie',
  'małopolskie','mazowieckie','opolskie','podkarpackie','podlaskie',
  'pomorskie','śląskie','świętokrzyskie','warmińsko-mazurskie','wielkopolskie',
  'zachodniopomorskie'
];
const DB_SET = new Set(DB_VOIVODESHIPS);

function toDbVoiv(value) {
  if (!value) return '';
  const v = String(value).trim().toLowerCase();
  const asciiMap = {
    lodzkie: 'łódzkie',
    slaskie: 'śląskie',
    swietokrzyskie: 'świętokrzyskie',
    warminsko_mazurskie: 'warmińsko-mazurskie',
    warminsko_mazurskie2: 'warmińsko-mazurskie',
    warminsko_mazurskie3: 'warmińsko-mazurskie',
    kujawsko_pomorskie: 'kujawsko-pomorskie',
    zachodniopomorskie: 'zachodniopomorskie',
  };
  if (DB_SET.has(v)) return v;
  if (asciiMap[v]) return asciiMap[v];
  const normalized = v.replace(/_/g, '-');
  return DB_SET.has(normalized) ? normalized : v;
}

export default function MapElement() {
  const location = useLocation();
  const language = useMemo(
    () => (location.pathname.split('/')[1] || 'pl').toLowerCase(),
    [location.pathname]
  );

  const [t, setT] = useState({ paths: [], cities: {} });
  const [selectedRegion, setSelectedRegion] = useState(null); 
  const [selectedCity, setSelectedCity] = useState(null);
  const [recruitment, setRecruitment] = useState(null);
  const [showArticle, setShowArticle] = useState(false);

  const regionRef = useRef(null);
  const articleRef = useRef(null);

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
          const safe = {
            paths: Array.isArray(data?.paths) ? data.paths : [],
            cities: data?.cities || {},
          };
          LOCALE_CACHE.set(language, safe);
          if (active) setT(safe);
        }
      } catch (e) {
        console.error('Map i18n error:', e);
        if (active) setT({ paths: [], cities: {} });
      }
    })();
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('recruitments')
          .select('id, instagram, form, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (active) setRecruitment(data || null);
      } catch (e) {
        console.error('Map recruitments error:', e);
        if (active) setRecruitment(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const scrollTo = (el) => {
    if (!el?.current) return;
    try {
      el.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch {
      window.scrollTo({ top: el.current.offsetTop ?? 0, behavior: 'smooth' });
    }
  };

  const handleSelectRegion = useCallback((voivRaw) => {
    const voiv = toDbVoiv(voivRaw);
    setSelectedCity(null);
    setShowArticle(false);
    setSelectedRegion(voiv);
    setTimeout(() => scrollTo(regionRef), 0);
  }, []);

  const handlePathActivate = (e) => {
    const voivAttr = e.currentTarget.getAttribute('data-voiv');
    handleSelectRegion(voivAttr);
  };

  const handlePathKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const voivAttr = e.currentTarget.getAttribute('data-voiv');
      handleSelectRegion(voivAttr);
    }
  };

  const toggleArticle = () => {
    setShowArticle((v) => !v);
    setTimeout(() => scrollTo(articleRef), 0);
  };

  const content = Array.isArray(t.cities?.content) ? t.cities.content : [];
  const cta = t.cities?.cta || 'Załóż nową grupę';
  const h1 = t.cities?.h1 || 'Wybierz województwo';

  return (
    <main className="cities">
      <div className="map">
        <svg
          className="map"
          version="1.1"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
          role="group"
          aria-label={t.cities?.mapLabel || 'Mapa województw'}
        >
          {t.paths.map((path, index) => {
            const canonicalVoiv =
              toDbVoiv(path.voivodeship || path.voiv || path.name || path.ariaLabel || path.id || `region-${index}`);

            const { d, ...rest } = path;

            return (
              <path
                key={canonicalVoiv || `region-${index}`}
                id={`voiv-${canonicalVoiv || index}`}
                d={d}
                {...rest}
                data-voiv={canonicalVoiv}
                className={clsx('region', selectedRegion === canonicalVoiv && 'chosen')}
                tabIndex={0}
                role="button"
                aria-pressed={selectedRegion === canonicalVoiv ? 'true' : 'false'}
                aria-label={path.ariaLabel || path.name || canonicalVoiv}
                onClick={handlePathActivate}
                onKeyDown={handlePathKeyDown}
              />
            );
          })}
        </svg>
      </div>

      {selectedRegion ? (
        <div className="citiesInfo" ref={regionRef}>
          <Cities
            selectedRegion={selectedRegion}  
            onSelectCity={setSelectedCity}
            selectedCity={selectedCity}
          />
          <button type="button" onClick={toggleArticle} className="startNewGroup primaryBtn">
            {cta}
          </button>
        </div>
      ) : (
        <div ref={regionRef} className="citiesInfo">
          <h2>{h1}</h2>
          <button type="button" className="startNewGroup primaryBtn" onClick={toggleArticle}>
            {cta}
          </button>
        </div>
      )}

      {showArticle && (
        <article className="newLocalGroup" ref={articleRef}>
          {content[0] && <h3>{content[0]}</h3>}
          {content[1] && <p>{content[1]}</p>}
          {content[2] && <p>{content[2]}</p>}
          {content[3] && <p>{content[3]}</p>}

          <p className="contactUs">
            {content[4] || ''}
            {recruitment?.instagram && (
              <a
                className="joinUsButton"
                href={recruitment.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                {(content[5] || 'Instagram')}&nbsp;<i className="bi bi-instagram" aria-hidden="true" />
              </a>
            )}
          </p>
        </article>
      )}
    </main>
  );
}
