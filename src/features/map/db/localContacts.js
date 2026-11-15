import { supabase } from '../../../services/supabaseClient.js';

export async function fetchLocalContacts() {
  const { data, error } = await supabase
    .from('local_contact_people')
    .select('id, name, facebook, phone, email, city')
    .order('city', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    name: r.name || '',
    facebook: r.facebook || '',
    phone: r.phone || '',
    email: r.email || '',
    city: r.city || '',
  }));
}

/** Dane publiczne osob kontaktowych w miescie: bez telefonu i adresu e-mail. */
export async function fetchPublicLocalContacts(city) {
  const { data, error } = await supabase
    .from('local_contact_people')
    .select('id, name, facebook, city')
    .eq('city', city)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createLocalContact(payload) {
  const { error } = await supabase.from('local_contact_people').insert(payload);
  if (error) throw error;
}

export async function updateLocalContact(id, payload) {
  const { error } = await supabase.from('local_contact_people').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteLocalContact(id) {
  const { error } = await supabase.from('local_contact_people').delete().eq('id', id);
  if (error) throw error;
}
