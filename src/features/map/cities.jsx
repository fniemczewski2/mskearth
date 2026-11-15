import PropTypes from 'prop-types';

import Loader from '../../shared/components/Loader.jsx';
import useQuery from '../../shared/hooks/useQuery.js';
import { safeHref } from '../../shared/lib/safeHref.js';
import { fetchCitiesByVoivodeship } from './db/cities.js';
import { fetchPublicLocalContacts } from './db/localContacts.js';
import { format, useTranslations } from '../../shared/i18n/useTranslations.js';

// Starsze wpisy w bazie maja literowke w nazwie wojewodztwa.
const VOIVODESHIP_ALIASES = { świętokrzyskie: ['świętokrzyskie', 'świetokrzyskie'] };

function Cities({ selectedRegion = null, onSelectCity, selectedCity = null }) {
  const { t } = useTranslations();
  const c = t.cities ?? {};
  const newTab = t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)';

  const cityQuery = useQuery(selectedRegion ? `cities:${selectedRegion}` : null, () =>
    fetchCitiesByVoivodeship(VOIVODESHIP_ALIASES[selectedRegion] ?? [selectedRegion])
  );
  const cityList = cityQuery.data ?? [];
  const cityLoading = cityQuery.loading;

  const cityName = selectedCity?.name;
  const peopleQuery = useQuery(cityName ? `local-contacts:${cityName}` : null, () =>
    fetchPublicLocalContacts(cityName)
  );
  const contactPeople = peopleQuery.data ?? [];
  const peopleLoading = peopleQuery.loading;
  const peopleError = Boolean(peopleQuery.error);

  const facebook = safeHref(selectedCity?.facebook);
  const instagram = safeHref(selectedCity?.instagram);

  return (
    <>
      <h2 className="voivodeshipName" id={`region-${selectedRegion}`}>
        {c.voivodeship || 'Województwo'} {selectedRegion || ''}
      </h2>

      <div aria-busy={cityLoading ? 'true' : 'false'}>
        {cityLoading && <Loader label={c.loading ?? 'Ładowanie miast…'} />}
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
                {facebook && (
                  <a className="social-media-link" href={facebook} target="_blank" rel="noopener noreferrer">
                    <i className="social-icon bi bi-facebook" aria-hidden="true" />
                    <span className="sr-only">
                      {format(c.cityFacebook ?? 'Facebook grupy {city}', { city: selectedCity.name })}{' '}
                      {newTab}
                    </span>
                  </a>
                )}
                {instagram && (
                  <a className="social-media-link" href={instagram} target="_blank" rel="noopener noreferrer">
                    <i className="social-icon bi bi-instagram" aria-hidden="true" />
                    <span className="sr-only">
                      {format(c.cityInstagram ?? 'Instagram grupy {city}', { city: selectedCity.name })}{' '}
                      {newTab}
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
                {peopleLoading && <Loader />}
                {!peopleLoading && peopleError && (
                  <p role="alert">{c.loadError ?? 'Nie udało się wczytać kontaktów.'}</p>
                )}
                {!peopleLoading && !peopleError && contactPeople.length > 0 && (
                  <>
                    <p>{c.contactPeople || 'Osoby kontaktowe:'}</p>
                    <ul>
                      {contactPeople.map((person) => (
                        <li key={person.id || person.name}>
                          <p className="personDetails">
                            <i className="bi bi-person-fill" aria-hidden="true" />
                            {person.name}
                            {safeHref(person.facebook) && (
                              <a
                                className="social-media-link"
                                href={safeHref(person.facebook)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="social-icon bi bi-facebook" aria-hidden="true" />
                                <span className="sr-only">
                                  {format(c.personFacebook ?? 'Facebook: {name}', { name: person.name })}{' '}
                                  {newTab}
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
