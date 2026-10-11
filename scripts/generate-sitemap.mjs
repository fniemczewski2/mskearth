import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const base = 'https://msk.earth';
const langs = ['pl', 'en'];
const paths = ['', '/aktualnosci', '/o-nas', '/miasta', '/fundacja', '/kontakt', '/wesprzyj'];

async function fetchArticles() {
  // Wystarczy klucz anon: polityki RLS i tak udostepniaja tylko opublikowane artykuly.
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('[sitemap] Brak SUPABASE_URL/SUPABASE_ANON_KEY - pomijam artykuly.');
    return [];
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('articles')
      .select('id, published, content, contenten')
      .eq('accepted', true)
      .not('published', 'is', null)
      .lte('published', new Date().toISOString())
      .order('published', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn('[sitemap] Nie udalo sie pobrac artykulow:', err.message);
    return [];
  }
}

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
const articleLangs = (a) => langs.filter((l) => hasText(l === 'en' ? a.contenten : a.content));

function entry(loc, lastmod, entryLangs = langs) {
  if (entryLangs.length < 2) {
    return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ''}
  </url>`;
  }
  const alternates = entryLangs
    .map((l) => {
      const href = loc.replace(/^(https:\/\/[^/]+)\/(pl|en)/, `$1/${l}`);
      return `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`;
    })
    .join('\n');
  const xDefault = loc.replace(/^(https:\/\/[^/]+)\/(pl|en)/, '$1/pl');

  return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ''}
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefault}"/>
  </url>`;
}

const articles = await fetchArticles();

const urls = [
  ...langs.flatMap((l) => paths.map((p) => entry(`${base}/${l}${p}`))),
  // Tylko wersje jezykowe, ktore maja tresc (artykul bez tlumaczenia EN ma noindex).
  ...articles.flatMap((a) => {
    const available = articleLangs(a);
    return available.map((l) => entry(`${base}/${l}/aktualnosci/${a.id}`, a.published, available));
  }),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

await writeFile('dist/sitemap.xml', xml, 'utf8');
console.log(`[sitemap] Zapisano ${urls.length} adresow.`);
