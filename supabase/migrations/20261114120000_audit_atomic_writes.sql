-- Poprawki z audytu 2026-11: zapisy atomowe i limity uploadu po stronie serwera.
-- Kod aplikacji dziala rowniez przed wdrozeniem tej migracji (sciezki zgodne wstecz).

-- 1. Okno ankiety razem ze slotami w jednej transakcji.
create or replace function public.add_survey_window(p_survey_id uuid, p_window jsonb, p_slots jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.survey_windows (survey_id, slot_date, start_time, end_time, slot_minutes)
  values (
    p_survey_id,
    (p_window->>'slot_date')::date,
    (p_window->>'start_time')::time,
    (p_window->>'end_time')::time,
    nullif(p_window->>'slot_minutes', '')::int
  )
  returning id into v_window_id;

  insert into public.survey_slots (survey_id, window_id, slot_date, start_time, end_time)
  select p_survey_id, v_window_id, (s->>'slot_date')::date, (s->>'start_time')::time, (s->>'end_time')::time
  from jsonb_array_elements(p_slots) as s;

  return v_window_id;
end;
$$;

revoke all on function public.add_survey_window(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.add_survey_window(uuid, jsonb, jsonb) to authenticated;

-- 2. Zapis sesji Stripe Checkout: blokada na identyfikatorze sesji, wiec rownolegle
--    zdarzenia webhooka nie tworza dwoch wierszy ani nie cofaja statusu "completed".
create or replace function public.record_donation_session(p_row jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.donations;
  v_count integer;
begin
  r := jsonb_populate_record(null::public.donations, p_row);
  if r.stripe_session_id is null then
    raise exception 'missing_session';
  end if;

  perform pg_advisory_xact_lock(hashtext(r.stripe_session_id));

  update public.donations d
  set status = r.status,
      completed_at = r.completed_at,
      stripe_payment_intent_id = r.stripe_payment_intent_id
  where d.stripe_session_id = r.stripe_session_id
    and (r.status::text <> 'pending' or d.status::text = 'pending');
  get diagnostics v_count = row_count;
  if v_count > 0 then
    return;
  end if;

  if exists (select 1 from public.donations d where d.stripe_session_id = r.stripe_session_id) then
    return;
  end if;

  insert into public.donations (
    amount, currency, donor_name, donor_email, status, completed_at,
    stripe_payment_intent_id, stripe_session_id, newsletter, payment_type
  )
  values (
    r.amount, r.currency, r.donor_name, r.donor_email, r.status, r.completed_at,
    r.stripe_payment_intent_id, r.stripe_session_id, r.newsletter, r.payment_type
  );
end;
$$;

revoke all on function public.record_donation_session(jsonb) from public, anon, authenticated;
grant execute on function public.record_donation_session(jsonb) to service_role;

-- 3. Limity typu i rozmiaru plikow egzekwowane przez Storage, nie tylko przez przegladarke.
--    Wartosci zgodne z src/services/storage/useUploadFiles.js (najwiekszy dozwolony plik: PDF 20 MB).
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
where id = 'mskearth';
