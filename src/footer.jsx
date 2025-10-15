import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SocialLink from './components/socialLink';

async function fetchLocale(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error loading translations:', err);
    return null;
  }
}

function Footer({ lang, handleLanguageChange: _handleLanguageChange }) {
  const location = useLocation();

  const effectiveLang = useMemo(() => {
    const seg = (location.pathname.split('/')[1] || '').toLowerCase();
    const supported = ['pl', 'en', 'ua'];
    if (lang && supported.includes(lang)) return lang;
    return supported.includes(seg) ? seg : 'pl';
  }, [lang, location.pathname]);

  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchLocale(effectiveLang);
        if (!active || !data) return;
        setMenuItems(data?.footer?.menuItems ?? []);
      } catch (e) {
        if (active) setMenuItems([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [effectiveLang]);

  return (
    <footer>
      <div className="info">
        <h2>Młodzieżowy Strajk Klimatyczny</h2>
      </div>

      <div className="social-icons">
        <SocialLink label="Link do profilu MSK na Facebooku" link="https://www.facebook.com/msk.polska" icon="bi bi-facebook" />
        <SocialLink label="Link do profilu MSK na Instagramie" link="https://www.instagram.com/mlodziezowystrajkklimatyczny" icon="bi bi-instagram" />
        <SocialLink label="Link do profilu MSK na TikToku" link="https://www.tiktok.com/@msklimatyczny" icon="bi bi-tiktok" />
        <SocialLink label="Link do profilu MSK w serwisie X (dawniej Twitter)" link="https://twitter.com/msklimatyczny" icon="bi bi-twitter-x" />
        <SocialLink label="Link do kanału MSK na YouTube" link="https://www.youtube.com/@ModziezowyStrajkKlimatyczny" icon="bi bi-youtube" />
      </div>

      <FooterMenu menuItems={menuItems} lang={effectiveLang} />

      <p>&copy; {new Date().getFullYear()} Młodzieżowy Strajk Klimatyczny - Fridays For Future Poland</p>
    </footer>
  );
}

function FooterMenu({ menuItems, lang }) {
  return (
    <nav className="foot-menu">
      <ul>
        {menuItems.map((item, index) => {
          const isPrivacy = item.label === 'Polityka prywatności';
          const link = isPrivacy
            ? '/polityka-prywatnosci.pdf'
            : (item.link ? item.link.replace(':lang', lang) : '#');

          return (
            <li key={item.id ?? item.link ?? index}>
              {isPrivacy ? (
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {item.label}
                </a>
              ) : (
                /^https?:\/\//i.test(link) ? (
                  <a href={link}>{item.label}</a>
                ) : (
                  <Link to={link}>{item.label}</Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Footer;
