import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './style/footer.css';
import SocialLink from './services/socialLink';

const fetchTranslations = async (lang) => {
  try {
    const response = await fetch(`/locales/${lang}.json`);
    const data = await response.json();
    return data.footer.menuItems; 
  } catch (error) {
    console.error('Error loading translations:', error);
    return []; 
  }
};

function Footer() {
  const [menuItems, setMenuItems] = useState([]);
  const [language, setLanguage] = useState('pl'); 

  useEffect(() => {
    const lang = window.location.pathname.split('/')[1] || 'pl';
    setLanguage(lang);
    fetchTranslations(lang).then(data => setMenuItems(data));
  }, [language]);

  return (
    <footer>
      <div className="info">
        <h2>Młodzieżowy Strajk Klimatyczny</h2>
      </div>
      <div className="social-icons">
        <SocialLink label="Link do profilu MSK na Facebooku" link="https://www.facebook.com/msk.polska" icon="bi bi-facebook" />
        <SocialLink label="Link do profilu MSK na Instagramie" link="https://www.instagram.com/mlodziezowystrajkklimatyczny" icon="bi bi-instagram" />
        <SocialLink label="Link do profilu MSK na TikToku" link="https://www.tiktok.com/@msklimatyczny" icon="bi bi-tiktok" />
        <SocialLink label="Link do profilu MSK w serwisie X (dawniej twitter)" link="https://twitter.com/msklimatyczny" icon="bi bi-twitter-x" />
        <SocialLink label="Link do kanału MSK na Youtubie" link="https://www.youtube.com/@ModziezowyStrajkKlimatyczny" icon="bi bi-youtube" />
      </div>
      <FooterMenu menuItems={menuItems} lang={language} />
      <p>&copy; 2024. Młodzieżowy Strajk Klimatyczny - Fridays For Future Poland</p>
    </footer>
  );
}

function FooterMenu({ menuItems, lang }) {
  return (
    <nav className="foot-menu">
      <ul>
        {menuItems.map((item, index) => {
          const link = item.label === "Polityka prywatności" 
            ? "/polityka-prywatnosci.pdf" 
            : item.link.replace(':lang', lang);

          return (
            <li key={index}>
              {item.label === "Polityka prywatności" 
                ? <a href={link} target="_blank" rel="noopener noreferrer">{item.label}</a> 
                : <Link to={link}>{item.label}</Link>
              }
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Footer;
