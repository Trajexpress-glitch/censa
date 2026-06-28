-- ============================================================
--  CENSA — Patch « social » (ami·e·s partagés + appels)
--  À coller dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : sans danger si relancé.
--
--  Ce patch garantit que la table des INVITATIONS existe avec
--  les bonnes règles de sécurité (RLS), pour que :
--    · une demande d'ami(e) envoyée par A ARRIVE chez B,
--    · l'acceptation crée une amitié visible des DEUX côtés,
--    · le fil / la messagerie / les appels voient les vrais ami(e)s.
--
--  La PRÉSENCE en ligne et les APPELS (WebRTC) passent par
--  Supabase Realtime (présence + broadcast) : aucune table requise.
-- ============================================================

-- Table des invitations (= base des amitiés, modèle « centré invitation »).
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references public.profiles(id) on delete cascade,
  to_user      uuid references public.profiles(id) on delete cascade,
  to_email     text,
  status       text not null default 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at   timestamptz not null default now()
);
create index if not exists idx_invites_to   on public.invites(to_user, status);
create index if not exists idx_invites_from on public.invites(from_user, status);

alter table public.invites enable row level security;

-- Règles d'accès : seuls l'expéditeur et le destinataire voient/agissent.
drop policy if exists "invite_read"   on public.invites;
drop policy if exists "invite_insert" on public.invites;
drop policy if exists "invite_update" on public.invites;
drop policy if exists "invite_delete" on public.invites;

create policy "invite_read"   on public.invites for select
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy "invite_insert" on public.invites for insert
  with check (auth.uid() = from_user);
create policy "invite_update" on public.invites for update
  using (auth.uid() = to_user or auth.uid() = from_user);
create policy "invite_delete" on public.invites for delete
  using (auth.uid() = from_user or auth.uid() = to_user);

-- Droits de base (la sécurité fine reste assurée par les politiques RLS).
grant select, insert, update, delete on public.invites to anon, authenticated;

-- ============================================================
--  FIN — Après exécution :
--   · les demandes d'ami(e)s sont réellement partagées,
--   · acceptez une demande → vous devenez ami(e)s des deux côtés,
--   · les membres en ligne se voient (présence Realtime),
--   · les appels audio/vidéo 1:1 passent (WebRTC).
-- ============================================================
