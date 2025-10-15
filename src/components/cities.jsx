import { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useLocation } from 'react-router-dom';
import { supabase } from "../services/supabaseClient";

const LOCALE_CACHE = new Map();

function Cities({ selectedRegion, onSelectCity, selectedCity }) {
  const location = useLocation();
  const language = useMemo(() => location.pathname.split('/')[1] || 'pl', [location.pathname]);

  const [translations, setTranslations] = useState({ cities: {} });

  const [cityList, setCityList] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [contactPeople, setContactPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (LOCALE_CACHE.has(language)) {
          if (active) setTranslations(LOCALE_CACHE.get(language));
          return;
        }
        const res = await fetch(`/locales/${language}.json`, { credentials: 'same-origin' });
        const data = await res.json();
        LOCALE_CACHE.set(language, data);
        if (active) setTranslations(data);
      } catch (err) {
        console.error('Error loading translations:', err);
        if (active) setTranslations({ cities: {} });
      }
    };
    load();
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    const fetchCityList = async () => {
      if (!selectedRegion) {
        setCityList([]);
        return;
      }
      setCityLoading(true);
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id,name,voivodeship,facebook,instagram,meetings') 
          .eq('voivodeship', selectedRegion)
          .order('name', { ascending: true });
        
        if (error) throw error;
        if (active) setCityList(data || []);
      } catch (err) {
        console.error('Cities error:', err);
        if (active) {
          setCityList([]);
        }
      } finally {
        if (active) setCityLoading(false);
      }
    };
    fetchCityList();
    return () => { active = false; };
  }, [selectedRegion]);

  useEffect(() => {
    let active = true;
    const fetchContactPeople = async () => {
      setContactPeople([]);
      setPeopleError('');
      if (!selectedCity?.name) return;

      setPeopleLoading(true);
      try {
        const { data, error } = await supabase
          .from('local_contact_people')
          .select('id,name,facebook,city') 
          .eq('city', selectedCity.name)
          .order('name', { ascending: true });

        if (error) throw error;
        if (active) setContactPeople(data || []);
      } catch (err) {
        console.error('Contact people error:', err);
        if (active) {
          setContactPeople([]);
          setPeopleError('Nie udało się wczytać kontaktów.');
        }
      } finally {
        if (active) setPeopleLoading(false);
      }
    };
    fetchContactPeople();
    return () => { active = false; };
  }, [selectedCity?.name]);

  return (
    <>
      <h2 className="voivodeshipName" id={selectedRegion}>
        {translations.cities?.voivodeship || 'Województwo'} {selectedRegion || ''}
      </h2>

      <div className="citiesInRegion" role="list" aria-busy={cityLoading ? 'true' : 'false'}>
        { cityList.length > 0 ? (
          cityList.map((city) => (
            <button
              key={city.id || city.name}
              onClick={() => onSelectCity?.(city)}
              className="city-chip"
              role="listitem"
              aria-pressed={selectedCity?.name === city.name}
            >
              {city.name}
            </button>
          ))
        ) : (
          <article><p>{translations.cities?.error || 'Brak miast do wyświetlenia.'}</p></article>
        )}
      </div>

      <div className="aboutCity">
        {selectedCity && (
          <article className="cityInfo">
            <h3 className="cityInfoHeader">
              {selectedCity.name}
              <div className="socialIcons">
                {selectedCity.facebook && (
                  <a
                    className="social-media-link"
                    href={selectedCity.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook miasta"
                    title="Facebook miasta"
                  >
                    <i className="social-icon bi bi-facebook" aria-hidden="true" />
                  </a>
                )}
                {selectedCity.instagram && (
                  <a
                    className="social-media-link"
                    href={selectedCity.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram miasta"
                    title="Instagram miasta"
                  >
                    <i className="social-icon bi bi-instagram" aria-hidden="true" />
                  </a>
                )}
              </div>
            </h3>

            <div className="cityDetails">
              {selectedCity.meetings && (
                <>
                  <p>{translations.cities?.meetings || 'Spotkania:'}</p>
                  <p className="localMeeting">
                    <i className="bi bi-calendar-check" aria-hidden="true" />
                    &nbsp;{selectedCity.meetings}
                  </p>
                </>
              )}

              <div className="peopleData" aria-busy={peopleLoading ? 'true' : 'false'}>
                {peopleLoading ? (
                  <div className="loader" aria-hidden="true" role="status" aria-live="polite" aria-busy="true">
                    <span className="spinner" aria-hidden="true"/>
                  </div>
                ) : peopleError ? (
                  <p role="alert">{peopleError}</p>
                ) : contactPeople?.length > 0 ? (
                  <>
                    <p>{translations.cities?.contactPeople || 'Osoby kontaktowe:'}</p>
                    <ul>
                      {contactPeople.map((person) => (
                        <li key={person.id || person.name}>
                          {person.name && (
                            <p className="personDetails">
                              <i className="bi bi-person-fill" aria-hidden="true" />
                              {person.name}
                              {person.facebook && (
                                <a
                                  className="social-media-link"
                                  href={person.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Facebook osoby ${person.name}`}
                                  title={`Facebook osoby ${person.name}`}
                                >
                                  <i className="social-icon bi bi-facebook" aria-hidden="true" />
                                </a>
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>

            <div className="cityIconContainer">
              <i className="cityIcon bi bi-buildings" aria-hidden="true" />
            </div>
          </article>
        )}
      </div>
    </>
  );
}

export default Cities;

Cities.propTypes = {
  selectedRegion: PropTypes.string,
  onSelectCity: PropTypes.func,
  selectedCity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,       
    voivodeship: PropTypes.string,
    facebook: PropTypes.string,
    instagram: PropTypes.string,
    meetings: PropTypes.string,
    imgalt: PropTypes.string,
  }),
};

Cities.defaultProps = {
  selectedRegion: null,
  onSelectCity: undefined,
  selectedCity: null,
};