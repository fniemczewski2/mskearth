import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

import Cities from './cities.jsx';
import { supabase } from '../../services/supabaseClient.js';
import Seo from '../../shared/components/Seo.jsx';
import { useTranslations } from '../../shared/i18n/useTranslations.js';
import { SITE_URL } from '../../shared/config/site.js';

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
  const { t, lang } = useTranslations();
  const paths = Array.isArray(t.paths) ? t.paths : [];
  const cities = t.cities ?? {};

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
    return () => {
      active = false;
    };
  }, []);

  const scrollToElement = (el) => {
    if (!el) return;
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    } catch {
      window.scrollTo({ top: el.offsetTop ?? 0 });
    }
  };

  const handleSelectRegion = useCallback((voivRaw) => {
    const voiv = toDbVoiv(voivRaw);
    setSelectedCity(null);
    setShowArticle(false);
    setSelectedRegion(voiv);
    setTimeout(() => scrollToElement(document.getElementById(`region-${voiv}`)), 0);
  }, []);

  const handlePathKeyDown = (e, voiv) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectRegion(voiv);
    }
  };

  const toggleArticle = () => {
    setShowArticle((v) => !v);
    setTimeout(() => scrollToElement(articleRef.current), 0);
  };

  const content = Array.isArray(cities.content) ? cities.content : [];
  const cta = cities.cta || 'Załóż nową grupę';
  const h1 = cities.h1 || 'Wybierz województwo';

  return (
    <main className="cities">
      <Seo
        title={t.seo?.cities?.title ?? 'Grupy lokalne – Młodzieżowy Strajk Klimatyczny'}
        description={t.seo?.cities?.description}
        url={`${SITE_URL}/${lang}/miasta`}
      />
      <h1 className="sr-only">{t.seo?.cities?.title ?? 'Grupy lokalne'}</h1>
      <div className="map">
        <svg
          className="map"
          version="1.1"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
          role="group"
          aria-label={t.a11y?.mapLabel || 'Mapa województw'}
        >
          {paths.map((path, index) => {
            const canonicalVoiv = toDbVoiv(
              path.voivodeship || path.voiv || path.name || path.ariaLabel || path.id || `region-${index}`
            );
            const label = path.ariaLabel || path.name || canonicalVoiv;

            // Tylko "d" trafia do DOM; pozostale klucze z JSON-a nie sa atrybutami SVG.
            return (
              <path
                key={canonicalVoiv || `region-${index}`}
                id={`voiv-${canonicalVoiv || index}`}
                d={path.d}
                className={clsx('region', selectedRegion === canonicalVoiv && 'chosen')}
                tabIndex={0}
                role="button"
                aria-pressed={selectedRegion === canonicalVoiv ? 'true' : 'false'}
                aria-label={label}
                onClick={() => handleSelectRegion(canonicalVoiv)}
                onKeyDown={(e) => handlePathKeyDown(e, canonicalVoiv)}
              >
                <title>{label}</title>
              </path>
            );
          })}
        </svg>
      </div>

      {selectedRegion ? (
        <div className="citiesInfo" ref={regionRef}>
          <Cities selectedRegion={selectedRegion} onSelectCity={setSelectedCity} selectedCity={selectedCity} />
          <button
            type="button"
            onClick={toggleArticle}
            className="startNewGroup primaryBtn"
            aria-expanded={showArticle}
            aria-controls="new-local-group"
          >
            {cta}
          </button>
        </div>
      ) : (
        <div ref={regionRef} className="citiesInfo">
          <h2>{h1}</h2>
          <button
            type="button"
            className="startNewGroup primaryBtn"
            onClick={toggleArticle}
            aria-expanded={showArticle}
            aria-controls="new-local-group"
          >
            {cta}
          </button>
        </div>
      )}

      {showArticle && (
        <article className="newLocalGroup" id="new-local-group" ref={articleRef}>
          {content[0] && <h2>{content[0]}</h2>}
          {content[1] && <p>{content[1]}</p>}
          {content[2] && <p>{content[2]}</p>}
          {content[3] && <p>{content[3]}</p>}

          <p className="contactUs">
            {content[4] || ''}
            {recruitment?.instagram && (
              <a className="joinUsButton" href={recruitment.instagram} target="_blank" rel="noopener noreferrer">
                {content[5] || 'Instagram'}
                <span className="sr-only"> {t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)'}</span>
                &nbsp;<i className="bi bi-instagram" aria-hidden="true" />
              </a>
            )}
          </p>
        </article>
      )}
    </main>
  );
}
