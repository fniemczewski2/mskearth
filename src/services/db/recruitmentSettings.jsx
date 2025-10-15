import { supabase } from "../supabaseClient";

export async function getRecruitmentSettings() {
  const { data, error } = await supabase
    .from("recruitments")
    .select("id, instagram, form")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function replaceRecruitmentSettings({ instagram, form }) {
  const del = await supabase.from("recruitments").delete().not("id", "is", null);
  if (del.error) throw del.error;

  const ins = await supabase.from("recruitments").insert({ instagram, form });
  if (ins.error) throw ins.error;
}
