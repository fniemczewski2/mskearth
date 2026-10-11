import { supabase } from "../../../services/supabaseClient";

export async function getRecruitmentSettings() {
  const { data, error } = await supabase
    .from("recruitments")
    .select("id, instagram, form, steps")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42703") {
      throw new Error(
        "Brak kolumny recruitments.steps. Uruchom migrację bazy (supabase db push) i spróbuj ponownie."
      );
    }
    throw error;
  }
  return data || null;
}

/**
 * Aktualizuje istniejacy wiersz zamiast "usun wszystko, potem wstaw".
 * Wczesniej nieudany insert kasowal ustawienia rekrutacji, a brak kolumny steps
 * powodowal ciche gubienie krokow.
 */
export async function replaceRecruitmentSettings({ instagram, form, steps }) {
  const current = await getRecruitmentSettings();
  const values = { instagram, form, steps: steps ?? [] };

  const { error } = current?.id
    ? await supabase.from("recruitments").update(values).eq("id", current.id)
    : await supabase.from("recruitments").insert(values);

  if (error) throw error;
}
