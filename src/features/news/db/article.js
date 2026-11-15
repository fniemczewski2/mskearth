import { supabase, toPublicUrl } from '../../../services/supabaseClient.js';
import { ADMIN_PAGE_SIZE, NEWS_PAGE_SIZE } from '../../../shared/config/site.js';

const PUBLIC_COLUMNS = `
  id, title, subtitle, content,
  titleen, subtitleen, contenten,
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
    imgurl: paths.map((p) => toPublicUrl(p)).filter(Boolean),
  };
}

/** Lista na strone aktualnosci: tylko opublikowane, bez przyszlych dat. */
export async function fetchPublishedArticles({ limit = NEWS_PAGE_SIZE, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, subtitle, content, titleen, subtitleen, contenten, imgurl, imgalt, published, pinned')
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
    .lte('published', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return mapArticleRow(data);
}

/** Strona listy w panelu: najnowsze wpisy, takze nieopublikowane. */
export async function fetchArticles({ limit = ADMIN_PAGE_SIZE, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('articles')
    .select(ADMIN_COLUMNS)
    .order('created', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map(mapArticleRow);
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

/**
 * Przelacza pole logiczne tylko wtedy, gdy w bazie nadal jest wartosc widziana przez administratora.
 * Dwie osoby klikajace jednoczesnie nie nadpisza sobie zmian.
 */
async function toggleFlag(id, column, current) {
  const { data, error } = await supabase
    .from('articles')
    .update({ [column]: !current })
    .eq('id', id)
    .eq(column, Boolean(current))
    .select('id');
  if (error) throw error;
  if (!data?.length)
    throw new Error('Artykuł został w międzyczasie zmieniony. Odśwież listę i spróbuj ponownie.');
}

export const toggleAccept = (id, current) => toggleFlag(id, 'accepted', current);
export const togglePinned = (id, current) => toggleFlag(id, 'pinned', current);
