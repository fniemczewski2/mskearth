import PropTypes from 'prop-types';

/** Pole-pulapka na boty: niewidoczne i pomijane przez klawiature oraz czytniki ekranu. */
export default function Honeypot({ id, name = 'company', value, onChange }) {
  const controlled = onChange ? { value, onChange: (e) => onChange(e.target.value) } : {};
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor={id}>Company</label>
      <input id={id} type="text" name={name} tabIndex={-1} autoComplete="off" {...controlled} />
    </div>
  );
}

Honeypot.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
};
