import { supabase } from '../../../services/supabaseClient.js';

const MISSING_COLUMN = '42703';

function latest(columns) {
  return supabase
    .from('recruitments')
    .select(columns)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** Ustawienia do widokow publicznych: bez kolumny steps (sprzed migracji) dzialaja kroki domyslne. */
export async function fetchPublicRecruitment() {
  let { data, error } = await latest('id, instagram, form, steps');
  if (error?.code === MISSING_COLUMN) ({ data, error } = await latest('id, instagram, form'));
  if (error) throw error;
  return data || null;
}

export async function getRecruitmentSettings() {
  const { data, error } = await latest('id, instagram, form, steps');

  if (error) {
    if (error.code === MISSING_COLUMN) {
      throw new Error(
        'Brak kolumny recruitments.steps. Uruchom migrację bazy (supabase db push) i spróbuj ponownie.'
      );
    }
    throw error;
  }
  return data || null;
}

/** Aktualizuje istniejacy wiersz; wstawia nowy tylko wtedy, gdy tabela jest pusta. */
export async function replaceRecruitmentSettings({ instagram, form, steps }) {
  const current = await getRecruitmentSettings();
  const values = { instagram, form, steps: steps ?? [] };

  const { error } = current?.id
    ? await supabase.from('recruitments').update(values).eq('id', current.id)
    : await supabase.from('recruitments').insert(values);

  if (error) throw error;
}
