import { supabase } from '../../../services/supabaseClient.js';

export async function fetchContactPeople() {
  const { data, error } = await supabase
    .from('contact_people')
    .select('id, name, phone, email, city')
    .order('city', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    name: r.name || '',
    phone: r.phone || '',
    email: r.email || '',
    city: r.city || '',
  }));
}

export async function createContactPerson(payload) {
  const { error } = await supabase.from('contact_people').insert(payload);
  if (error) throw error;
}

export async function updateContactPerson(id, payload) {
  const { error } = await supabase.from('contact_people').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteContactPerson(id) {
  const { error } = await supabase.from('contact_people').delete().eq('id', id);
  if (error) throw error;
}
