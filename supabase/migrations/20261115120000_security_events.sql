-- Dziennik operacji wykonanych w panelu administracyjnym (np. anulowanie wplaty cyklicznej w /admin/finanse).
-- Zapisuje wylacznie serwer kluczem secret (api/finance.js); administratorzy moga dziennik czytac.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null,
  actor_id uuid,
  actor_email text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "security_events admin read" on public.security_events;
create policy "security_events admin read"
  on public.security_events
  for select
  to authenticated
  using (public.is_admin());
