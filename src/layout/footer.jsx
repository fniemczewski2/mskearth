import { Link } from 'react-router-dom';

import SocialLink from '../shared/components/socialLink.jsx';
import { useTranslations } from '../shared/i18n/useTranslations.js';

const SOCIAL = [
  { key: 'facebook', link: 'https://www.facebook.com/msk.polska', icon: 'bi bi-facebook', fallback: 'MSK na Facebooku' },
  { key: 'instagram', link: 'https://www.instagram.com/mlodziezowystrajkklimatyczny', icon: 'bi bi-instagram', fallback: 'MSK na Instagramie' },
  { key: 'tiktok', link: 'https://www.tiktok.com/@msklimatyczny', icon: 'bi bi-tiktok', fallback: 'MSK na TikToku' },
  { key: 'x', link: 'https://x.com/msklimatyczny', icon: 'bi bi-twitter-x', fallback: 'MSK w serwisie X' },
  { key: 'youtube', link: 'https://www.youtube.com/@ModziezowyStrajkKlimatyczny', icon: 'bi bi-youtube', fallback: 'Kanał MSK na YouTube' },
];

function Footer({ lang }) {
  const { t } = useTranslations();
  const f = t.footer ?? {};
  const newTab = t.a11y?.opensNewTab ?? '(otwiera się w nowej karcie)';

  return (
    <footer>
      <div className="footer-grid">
        <div className="info">
          <h2>{f.title ?? 'Młodzieżowy Strajk Klimatyczny'}</h2>
        </div>

        <div className="social-icons">
          {SOCIAL.map((s) => (
            <SocialLink key={s.key} label={`${f.social?.[s.key] ?? s.fallback} ${newTab}`} link={s.link} icon={s.icon} />
          ))}
        </div>

        <FooterMenu menuItems={f.menuItems ?? []} lang={lang} newTab={newTab} label={f.navLabel ?? 'Stopka'} />

        <p>&copy; {new Date().getFullYear()} {f.copyright ?? 'Młodzieżowy Strajk Klimatyczny – Fridays for Future Polska'}</p>
      </div>
    </footer>
  );
}

function FooterMenu({ menuItems, lang, newTab, label }) {
  return (
    <nav className="foot-menu" aria-label={label}>
      <ul>
        {menuItems.map((item) => {
          const link = item.link ? item.link.replace(':lang', lang) : '#';
          const isFile = /\.pdf$/i.test(link);
          const isExternal = /^https?:\/\//i.test(link);

          return (
            <li key={link}>
              {isFile ? (
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {item.label}
                  <span className="sr-only"> (PDF) {newTab}</span>
                </a>
              ) : isExternal ? (
                <a href={link}>{item.label}</a>
              ) : (
                <Link to={link}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Footer;
