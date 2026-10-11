-- Każde konto Google z domeny @msk.earth lub @fpmsk.org.pl automatycznie dostaje
-- uprawnienia administratora (wpis w public.admins), bez ręcznego dodawania.
--
-- Uprawnienia nadajemy przy powiązaniu tożsamości Google z kontem (auth.identities),
-- a nie przy samym adresie e-mail: Google potwierdza, że osoba ma dostęp do skrzynki,
-- więc nikt nie zostanie administratorem przez założenie konta z cudzym adresem i hasłem.
--
-- Wymaga funkcji public.is_allowed_admin_email z migracji 20261011120000.

create or replace function public.grant_admin_from_google_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  identity_email text := lower(coalesce(new.identity_data ->> 'email', ''));
  verified text := coalesce(new.identity_data ->> 'email_verified', 'true');
begin
  if new.provider = 'google'
     and verified = 'true'
     and public.is_allowed_admin_email(identity_email) then
    insert into public.admins (user_id, email)
    values (new.user_id, identity_email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.grant_admin_from_google_identity() from authenticated, anon, public;

drop trigger if exists grant_admin_from_google_identity on auth.identities;
create trigger grant_admin_from_google_identity
  after insert on auth.identities
  for each row execute function public.grant_admin_from_google_identity();

-- Konta, które już logowały się przez Google z tych domen.
insert into public.admins (user_id, email)
select i.user_id, lower(i.identity_data ->> 'email')
from auth.identities i
where i.provider = 'google'
  and coalesce(i.identity_data ->> 'email_verified', 'true') = 'true'
  and public.is_allowed_admin_email(i.identity_data ->> 'email')
on conflict (user_id) do nothing;
