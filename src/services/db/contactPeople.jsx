import { supabase } from "../supabaseClient";

/** Pobierz listę osób kontaktowych (z nazwą miasta z relacji) */
export async function fetchContactPeople() {
  const { data, error } = await supabase
    .from("contact_people")
    .select("id, name, phone, email, city")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    name: r.name || "",
    phone: r.phone || "",
    email: r.email || "",
    city: r.city || "",
  }));
}

/** Pobierz jedną osobę po id (do edycji) */
export async function getContactPersonById(id) {
  const { data, error } = await supabase
    .from("contact_people")
    .select("id, name, phone, email, city")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Utwórz nową osobę */
export async function createContactPerson(payload) {
  const { error } = await supabase.from("contact_people").insert(payload);
  if (error) throw error;
}

/** Zaktualizuj istniejącą osobę */
export async function updateContactPerson(id, payload) {
  const { error } = await supabase
    .from("contact_people")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/** Usuń osobę */
export async function deleteContactPerson(id) {
  const { error } = await supabase.from("contact_people").delete().eq("id", id);
  if (error) throw error;
}
