import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { supabase } from '../../services/supabaseClient';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';

function Cities({ selectedRegion = null, onSelectCity, selectedCity = null }) {
  const { t } = useTranslations();
  const c = t.cities ?? {};
  const newTab = t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)';

  const [cityList, setCityList] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [contactPeople, setContactPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedRegion) {
        setCityList([]);
        return;
      }
      setCityLoading(true);
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id,name,voivodeship,facebook,instagram,meetings')
          // Starsze wpisy w bazie moga miec literowke "świetokrzyskie".
          .in(
            'voivodeship',
            selectedRegion === 'świętokrzyskie' ? ['świętokrzyskie', 'świetokrzyskie'] : [selectedRegion]
          )
          .order('name', { ascending: true });

        if (error) throw error;
        if (active) setCityList(data || []);
      } catch (err) {
        console.error('Cities error:', err);
        if (active) setCityList([]);
      } finally {
        if (active) setCityLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedRegion]);

  useEffect(() => {
    let active = true;
    (async () => {
      setContactPeople([]);
      setPeopleError(false);
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
        if (active) setPeopleError(true);
      } finally {
        if (active) setPeopleLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedCity?.name]);

  const loader = (label) => (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );

  return (
    <>
      <h2 className="voivodeshipName" id={`region-${selectedRegion}`}>
        {c.voivodeship || 'Województwo'} {selectedRegion || ''}
      </h2>

      <div aria-busy={cityLoading ? 'true' : 'false'}>
        {cityLoading && loader(c.loading ?? 'Ładowanie miast…')}
        {!cityLoading && cityList.length > 0 && (
          <ul className="citiesInRegion">
            {cityList.map((city) => (
              <li key={city.id || city.name}>
                <button
                  type="button"
                  onClick={() => onSelectCity?.(city)}
                  className="city-chip"
                  aria-pressed={selectedCity?.name === city.name}
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!cityLoading && cityList.length === 0 && (
          <article>
            <p>{c.error || 'Brak miast do wyświetlenia.'}</p>
          </article>
        )}
      </div>

      <div className="aboutCity" aria-live="polite">
        {selectedCity && (
          <article className="cityInfo">
            <div className="cityInfoHeader">
              <h3>{selectedCity.name}</h3>
              <div className="socialIcons">
                {selectedCity.facebook && (
                  <a className="social-media-link" href={selectedCity.facebook} target="_blank" rel="noopener noreferrer">
                    <i className="social-icon bi bi-facebook" aria-hidden="true" />
                    <span className="sr-only">
                      {format(c.cityFacebook ?? 'Facebook grupy {city}', { city: selectedCity.name })} {newTab}
                    </span>
                  </a>
                )}
                {selectedCity.instagram && (
                  <a className="social-media-link" href={selectedCity.instagram} target="_blank" rel="noopener noreferrer">
                    <i className="social-icon bi bi-instagram" aria-hidden="true" />
                    <span className="sr-only">
                      {format(c.cityInstagram ?? 'Instagram grupy {city}', { city: selectedCity.name })} {newTab}
                    </span>
                  </a>
                )}
              </div>
            </div>

            <div className="cityDetails">
              {selectedCity.meetings && (
                <>
                  <p>{c.meetings || 'Spotkania:'}</p>
                  <p className="localMeeting">
                    <i className="bi bi-calendar-check" aria-hidden="true" />
                    &nbsp;{selectedCity.meetings}
                  </p>
                </>
              )}

              <div className="peopleData" aria-busy={peopleLoading ? 'true' : 'false'}>
                {peopleLoading && loader(t.a11y?.loading ?? 'Ładowanie…')}
                {!peopleLoading && peopleError && <p role="alert">{c.loadError ?? 'Nie udało się wczytać kontaktów.'}</p>}
                {!peopleLoading && !peopleError && contactPeople.length > 0 && (
                  <>
                    <p>{c.contactPeople || 'Osoby kontaktowe:'}</p>
                    <ul>
                      {contactPeople.map((person) => (
                        <li key={person.id || person.name}>
                          <p className="personDetails">
                            <i className="bi bi-person-fill" aria-hidden="true" />
                            {person.name}
                            {person.facebook && (
                              <a className="social-media-link" href={person.facebook} target="_blank" rel="noopener noreferrer">
                                <i className="social-icon bi bi-facebook" aria-hidden="true" />
                                <span className="sr-only">
                                  {format(c.personFacebook ?? 'Facebook: {name}', { name: person.name })} {newTab}
                                </span>
                              </a>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="cityIconContainer" aria-hidden="true">
              <i className="cityIcon bi bi-buildings" />
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
  }),
};
