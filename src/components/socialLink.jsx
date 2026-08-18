
function SocialLink({ link, icon, label }) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <i className={`social-icon ${icon}`} />
      </a>
    );
}

export default SocialLink;