import PropTypes from 'prop-types';

/**
 * React 19 podnosi <title> i <meta> z drzewa komponentow do <head>,
 * wiec kazda podstrona moze miec wlasne metadane bez dodatkowej biblioteki.
 *
 * Uwaga: to dziala po stronie klienta. Scrapery Facebooka i Twittera
 * nie wykonuja JS, wiec do poprawnych podgladow linkow potrzebny jest
 * prerendering albo przejscie na framework z SSG.
 */
export default function Seo({ title, description, image, url, type = 'website' }) {
  const absImage = image?.startsWith('http')
    ? image
    : `https://msk.earth${image ?? '/logoMSK-kolor.png'}`;

  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={absImage} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={absImage} />
    </>
  );
}

Seo.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
};
