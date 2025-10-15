import { supabase } from "../supabaseClient";
import { toPublicUrl } from "../supabaseClient";

function mapArticleRow(a) {
  const paths = Array.isArray(a.imgurl) ? a.imgurl : a.imgurl ? [a.imgurl] : [];
  return {
    ...a,
    imgPaths: paths,                    
    imgurl: paths.map((p) => toPublicUrl(p, "mskearth")),
    sourceLink: a.sourcelink || null,
    sourceText: a.sourcetext || null,
  };
}

export async function fetchArticles() {
  const { data, error } = await supabase
    .from("articles")
    .select(`
      id, title, subtitle, content,
      titleen, subtitleen, contenten,
      titleua, subtitleua, contentua,
      imgurl, imgalt, author, created,
      accepted, published, sourcelink, sourcetext,
      pinned
    `)
    .order("created", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapArticleRow);
}

export async function getArticleById(id) {
  const { data, error } = await supabase
    .from("articles")
    .select(`
      id, title, subtitle, content,
      titleen, subtitleen, contenten,
      titleua, subtitleua, contentua,
      imgurl, imgalt, author, created,
      accepted, published, sourcelink, sourcetext,
      pinned
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapArticleRow(data);
}

export async function createArticle(payload) {
  const { error } = await supabase.from("articles").insert(payload);
  if (error) throw error;
}

export async function updateArticle(id, payload) {
  const { error } = await supabase.from("articles").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteArticle(id) {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleAccept(id) {
  const { data, error } = await supabase
    .from("articles")
    .select("accepted")
    .eq("id", id)
    .single();
  if (error) throw error;

  const { error: updErr } = await supabase
    .from("articles")
    .update({ accepted: !data?.accepted })
    .eq("id", id);

  if (updErr) throw updErr;
}

export async function togglePinned(id) {
  const { data, error } = await supabase
    .from("articles")
    .select("pinned")
    .eq("id", id)
    .single();
  if (error) throw error;

  const { error: updErr } = await supabase
    .from("articles")
    .update({ pinned: !data?.pinned })
    .eq("id", id);

  if (updErr) throw updErr;
}
