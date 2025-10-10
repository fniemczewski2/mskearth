import { Link } from 'react-router-dom';

function SocialLink({ link, icon, label }) {
    return (
      <Link target="_blank" to={link} aria-label={label} >
        <i className={`social-icon ${icon}`} />
      </Link>
    );
}

export default SocialLink;