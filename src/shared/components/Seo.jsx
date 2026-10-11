import PropTypes from 'prop-types';

import { DEFAULT_OG_IMAGE, SITE_URL } from '../config/site.js';

const LANGS = ['pl', 'en'];

function alternateFor(url, lang) {
  return url.replace(/^(https:\/\/[^/]+)\/(pl|en)(?=\/|$)/, `$1/${lang}`);
}

export default function Seo({ title, description, image, url, type = 'website', noindex = false }) {
  const absImage = image?.startsWith('http') ? image : `${SITE_URL}${image ?? DEFAULT_OG_IMAGE}`;
  const hasLangPrefix = url && /^https:\/\/[^/]+\/(pl|en)(\/|$)/.test(url);

  return (
    <>
      <title>{title}</title>
      {noindex && <meta name="robots" content="noindex" />}
      {description && <meta name="description" content={description} />}
      {url && !noindex && <link rel="canonical" href={url} />}
      {hasLangPrefix &&
        !noindex &&
        LANGS.map((l) => <link key={l} rel="alternate" hrefLang={l} href={alternateFor(url, l)} />)}
      {hasLangPrefix && !noindex && (
        <link rel="alternate" hrefLang="x-default" href={alternateFor(url, 'pl')} />
      )}
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
  noindex: PropTypes.bool,
};
