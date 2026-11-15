import { supabase } from '../../../services/supabaseClient.js';

const COLUMNS = 'id, name, facebook, instagram, meetings, voivodeship';

export async function fetchCities() {
  const { data, error } = await supabase
    .from('cities')
    .select(COLUMNS)
    .order('voivodeship', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Miasta jednego wojewodztwa; przyjmuje kilka pisowni nazwy (starsze wpisy w bazie). */
export async function fetchCitiesByVoivodeship(names) {
  const { data, error } = await supabase
    .from('cities')
    .select(COLUMNS)
    .in('voivodeship', names)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCity(payload) {
  const { error } = await supabase.from('cities').insert(payload);
  if (error) throw error;
}

export async function updateCity(id, payload) {
  const { error } = await supabase.from('cities').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCity(id) {
  const { error } = await supabase.from('cities').delete().eq('id', id);
  if (error) throw error;
}
