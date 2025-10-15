import { supabase } from "../supabaseClient";

export async function fetchCities() {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, facebook, instagram, meetings, voivodeship")
    .order("voivodeship", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCityById(id) {
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, facebook, instagram, meetings, voivodeship")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCity(payload) {
  const { error } = await supabase.from("cities").insert(payload);
  if (error) throw error;
}

export async function updateCity(id, payload) {
  const { error } = await supabase.from("cities").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteCity(id) {
  const { error } = await supabase.from("cities").delete().eq("id", id);
  if (error) throw error;
}
