import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_LANG,
  DEFAULT_OG_IMAGE,
  LANGS,
  OG_LOCALE,
  ORG_NAME,
  PUBLIC_PATHS,
  SITE_URL,
  STORAGE_BUCKET,
} from '../src/shared/config/site.js';
import { log } from './_lib/log.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

/**
 * Wersja strony dla robotow, ktore nie wykonuja JavaScriptu (podglady linkow, czesc wyszukiwarek).
 * vercel.json kieruje tu zadania z ich User-Agent; ludzie dostaja aplikacje React.
 * Tresc (tytul, opis, obraz) jest ta sama, co w aplikacji.
 */
const SEO_KEYS = {
  '': 'home',
  '/aktualnosci': 'news',
  '/o-nas': 'about',
  '/miasta': 'cities',
  '/fundacja': 'foundation',
  '/kontakt': 'contact',
  '/wesprzyj': 'donate',
};
const DESCRIPTION_LENGTH = 155;

const locales = new Map();

async function loadLocale(lang) {
  if (!locales.has(lang)) {
    const file = path.join(process.cwd(), 'public', 'locales', `${lang}.json`);
    locales.set(lang, JSON.parse(await readFile(file, 'utf8')));
  }
  return locales.get(lang);
}

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const stripTags = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function shorten(text) {
  if (text.length <= DESCRIPTION_LENGTH) return text;
  const cut = text.lastIndexOf(' ', DESCRIPTION_LENGTH - 3);
  return `${text.slice(0, cut > 80 ? cut : DESCRIPTION_LENGTH - 3).trimEnd()}...`;
}

function storageUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${pathOrUrl}` : null;
}

async function articleMeta(lang, id, t) {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from('articles')
    .select('id, title, subtitle, content, titleen, subtitleen, contenten, imgurl, published')
    .eq('id', id)
    .eq('accepted', true)
    .not('published', 'is', null)
    .lte('published', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const suffix = lang === 'en' ? 'en' : '';
  const title = String(data[`title${suffix}`] ?? '').trim();
  const body = stripTags(data[`content${suffix}`]);
  if (!title || !body) return null;

  const images = Array.isArray(data.imgurl) ? data.imgurl : data.imgurl ? [data.imgurl] : [];
  const langs = LANGS.filter((l) => stripTags(l === 'en' ? data.contenten : data.content));
  return {
    title: `${title}${t.seo?.articleSuffix ?? ''}`,
    heading: title,
    description: String(data[`subtitle${suffix}`] ?? '').trim() || shorten(body),
    text: body,
    image: storageUrl(images[0]),
    type: 'article',
    published: data.published,
    langs,
  };
}

function render({ lang, url, meta, status }) {
  const image = meta.image ?? `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  const alternates =
    status === 200 && meta.langs.length > 1
      ? meta.langs
          .map(
            (l) =>
              `<link rel="alternate" hreflang="${l}" href="${escapeHtml(url.replace(`/${lang}`, `/${l}`))}">`
          )
          .join('')
      : '';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
${status === 200 ? `<link rel="canonical" href="${escapeHtml(url)}">` : '<meta name="robots" content="noindex">'}
${alternates}
<meta property="og:type" content="${meta.type ?? 'website'}">
<meta property="og:site_name" content="${escapeHtml(ORG_NAME)}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
${meta.published ? `<meta property="article:published_time" content="${escapeHtml(meta.published)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<main>
<h1>${escapeHtml(meta.heading ?? meta.title)}</h1>
<p>${escapeHtml(meta.text ?? meta.description)}</p>
<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
</main>
</body>
</html>`;
}

export default async function handler(req, res) {
  const lang = LANGS.includes(req.query?.lang) ? req.query.lang : DEFAULT_LANG;
  const rest = []
    .concat(req.query?.rest ?? [])
    .join('/')
    .replace(/^\/+|\/+$/g, '');
  const pagePath = rest ? `/${rest}` : '';
  const url = `${SITE_URL}/${lang}${pagePath}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Vary', 'User-Agent');

  try {
    const t = await loadLocale(lang);
    const articleId = /^\/aktualnosci\/([\w-]{1,64})$/.exec(pagePath)?.[1];
    let meta = null;

    if (articleId) {
      meta = await articleMeta(lang, articleId, t);
    } else if (PUBLIC_PATHS.includes(pagePath)) {
      const seo = t.seo?.[SEO_KEYS[pagePath]] ?? {};
      meta = { title: seo.title ?? ORG_NAME, description: seo.description ?? '', langs: LANGS };
    }

    if (!meta) {
      const notFound = {
        title: t.seo?.notFound?.title ?? ORG_NAME,
        heading: t.notFound?.title,
        description: t.notFound?.message ?? '',
        langs: [],
      };
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(404).send(render({ lang, url, meta: notFound, status: 404 }));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).send(render({ lang, url, meta, status: 200 }));
  } catch (err) {
    log.error('page_meta', err, { path: pagePath });
    return res.status(500).send('<!doctype html><title>Error</title>');
  }
}
