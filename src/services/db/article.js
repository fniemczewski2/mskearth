import { supabase, toPublicUrl } from '../supabaseClient.js';

const PUBLIC_COLUMNS = `
  id, title, subtitle, content,
  titleen, subtitleen, contenten,
  titleua, subtitleua, contentua,
  imgurl, imgalt, author, created, published,
  sourcelink, sourcetext, pinned
`;

const ADMIN_COLUMNS = `${PUBLIC_COLUMNS}, accepted`;

function mapArticleRow(a) {
  if (!a) return null;
  const paths = Array.isArray(a.imgurl) ? a.imgurl : a.imgurl ? [a.imgurl] : [];
  return {
    ...a,
    imgPaths: paths,
    imgurl: paths.map((p) => toPublicUrl(p, 'mskearth')),
  };
}

/* ------------------------- odczyt publiczny ------------------------- */

/**
 * Lista do widoku publicznego: tylko zaakceptowane i opublikowane,
 * bez tresci artykulow (te sciagamy dopiero na stronie szczegolow)
 * i ze stronicowaniem.
 */
export async function fetchPublishedArticles({ limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, subtitle, titleen, subtitleen, titleua, subtitleua, imgurl, imgalt, author, published, pinned')
    .eq('accepted', true)
    .not('published', 'is', null)
    .lte('published', new Date().toISOString())
    .order('pinned', { ascending: false })
    .order('published', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map(mapArticleRow);
}

export async function getPublishedArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .eq('accepted', true)
    .not('published', 'is', null)
    .maybeSingle();

  if (error) throw error;
  return mapArticleRow(data);
}

/* --------------------------- panel admina --------------------------- */

export async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select(ADMIN_COLUMNS)
    .order('created', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapArticleRow);
}

export async function getArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select(ADMIN_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return mapArticleRow(data);
}

export async function createArticle(payload) {
  const { error } = await supabase.from('articles').insert(payload);
  if (error) throw error;
}

export async function updateArticle(id, payload) {
  const { error } = await supabase.from('articles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteArticle(id) {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}

/** Przelaczniki przyjmuja aktualny stan, zeby nie robic zbednego SELECT-a. */
export async function toggleAccept(id, current) {
  const { error } = await supabase
    .from('articles')
    .update({ accepted: !current })
    .eq('id', id);
  if (error) throw error;
}

export async function togglePinned(id, current) {
  const { error } = await supabase
    .from('articles')
    .update({ pinned: !current })
    .eq('id', id);
  if (error) throw error;
}
