import { supabase } from "../supabaseClient";

const TABLE = "recruitment_calls";

export async function fetchRecruitmentCalls() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, date, time, link")
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRecruitmentCallById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, date, time, link")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createRecruitmentCall(payload) {
  const { error } = await supabase.from(TABLE).insert(payload);
  if (error) throw error;
}

export async function updateRecruitmentCall(id, payload) {
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteRecruitmentCall(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}