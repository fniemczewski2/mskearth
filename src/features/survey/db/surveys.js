import { supabase } from '../../../services/supabaseClient.js';

export async function fetchPublicSurvey(slug) {
  const { data, error } = await supabase.rpc('get_survey_public', { p_slug: slug });
  if (error) throw error;
  return data; // null, gdy ankieta nie istnieje
}

export async function fetchSurveys() {
  const { data, error } = await supabase
    .from('surveys')
    .select('*, survey_slots(count), survey_bookings(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSurveyDetails(id) {
  const [windows, slots, bookings] = await Promise.all([
    supabase.from('survey_windows').select('*').eq('survey_id', id).order('slot_date').order('start_time'),
    supabase.from('survey_slots').select('*').eq('survey_id', id).order('slot_date').order('start_time'),
    supabase.from('survey_bookings').select('*').eq('survey_id', id).order('created_at'),
  ]);
  for (const r of [windows, slots, bookings]) if (r.error) throw r.error;
  return { windows: windows.data, slots: slots.data, bookings: bookings.data };
}

export async function createSurvey(fields) {
  const { data, error } = await supabase.from('surveys').insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateSurvey(id, fields) {
  const { error } = await supabase.from('surveys').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteSurvey(id) {
  const { error } = await supabase.from('surveys').delete().eq('id', id);
  if (error) throw error;
}

const FUNCTION_NOT_FOUND = 'PGRST202';

/** Dodaje okno i jego sloty w jednej transakcji (funkcja SQL add_survey_window). */
export async function addWindow(surveyId, win, slots) {
  const windowRow = {
    slot_date: win.date,
    start_time: win.start,
    end_time: win.end,
    slot_minutes: win.slotMinutes || null,
  };
  const { error: rpcError } = await supabase.rpc('add_survey_window', {
    p_survey_id: surveyId,
    p_window: windowRow,
    p_slots: slots,
  });
  if (!rpcError) return;
  if (rpcError.code !== FUNCTION_NOT_FOUND) throw rpcError;

  // Baza bez migracji 20261114120000: dwa zapytania z recznym wycofaniem.
  const { data, error } = await supabase
    .from('survey_windows')
    .insert({ survey_id: surveyId, ...windowRow })
    .select()
    .single();
  if (error) throw error;

  const { error: slotErr } = await supabase
    .from('survey_slots')
    .insert(slots.map((s) => ({ ...s, survey_id: surveyId, window_id: data.id })));
  if (slotErr) {
    await supabase.from('survey_windows').delete().eq('id', data.id);
    throw slotErr;
  }
}

export async function deleteWindow(id) {
  const { error } = await supabase.from('survey_windows').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteBooking(id) {
  const { error } = await supabase.from('survey_bookings').delete().eq('id', id);
  if (error) throw error;
}
