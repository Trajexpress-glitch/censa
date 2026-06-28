-- ============================================================
--  CENSA — PATCH Supabase
--  À coller dans : Supabase → SQL Editor → New query → Run
--  Sans danger, peut être relancé. Corrige :
--    1) la table de synchronisation user_state (manquante)
--    2) les droits d'accès des rôles anon / authenticated
-- ============================================================

-- 1) Table de synchronisation par compte ---------------------
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "ustate_all" on public.user_state;
create policy "ustate_all" on public.user_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Droits d'accès au schéma public -------------------------
--    (la sécurité fine reste assurée par les politiques RLS)
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public to anon, authenticated;

grant usage, select
  on all sequences in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- ============================================================
--  FIN — Rechargez votre site, l'auth et la synchro fonctionnent.
-- ============================================================
