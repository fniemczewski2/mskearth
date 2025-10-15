import { supabase } from "../supabaseClient";

export async function fetchFoundationBoardMembers() {
  const { data, error } = await supabase
    .from("foundation_board_members")
    .select("id, name, role, role_en, role_ua, description, description_en, description_ua, phone, email, img_path")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getFoundationBoardMemberById(id) {
  const { data, error } = await supabase
    .from("foundation_board_members")
    .select("id, name, role, role_en, role_ua, description, description_en, description_ua, phone, email, img_path")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createFoundationBoardMember(payload) {
  const { error } = await supabase.from("foundation_board_members").insert(payload);
  if (error) throw error;
}

export async function updateFoundationBoardMember(id, payload) {
  const { error } = await supabase.from("foundation_board_members").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteFoundationBoardMember(id) {
  const { error } = await supabase.from("foundation_board_members").delete().eq("id", id);
  if (error) throw error;
}
