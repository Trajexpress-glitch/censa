-- ============================================================
--  CENSA — PATCH MESSAGES : messagerie persistante + temps réel
--  À coller dans : Supabase → SQL Editor → New query → Run
--  Idempotent : sans danger si relancé.
--
--  NB : on utilise une table DÉDIÉE « chat_messages » pour ne PAS
--  entrer en conflit avec la table « messages » déjà présente dans
--  supabase_schema.sql (qui a une autre structure). Rien d'autre
--  n'est modifié.
--
--  Pourquoi ce patch ?
--    Avant, les messages privés ne passaient QUE si l'ami était
--    connecté au même instant (diffusion éphémère). Désormais ils
--    sont ENREGISTRÉS en base :
--      · un ami hors ligne les reçoit à sa prochaine ouverture
--      · l'historique se synchronise sur tous les appareils
--      · les messages de GROUPE sont livrés à tous les membres
--  La livraison instantanée passe par Supabase Realtime
--  (postgres_changes : INSERT) — aucune autre configuration.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  mid          text primary key,                 -- identifiant client (anti-doublon)
  conv_kind    text not null check (conv_kind in ('dm','group')),
  pair_key     text,                             -- DM : "idA|idB" (trié) → conversation
  group_id     text,                             -- GROUPE : id du groupe
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid,                             -- DM : destinataire ; GROUPE : null
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_pair_idx  on public.chat_messages (pair_key, created_at);
create index if not exists chat_messages_group_idx on public.chat_messages (group_id, created_at);
create index if not exists chat_messages_recip_idx on public.chat_messages (recipient_id, created_at);

-- ---------- Sécurité (RLS) ----------
alter table public.chat_messages enable row level security;

-- On n'insère QUE ses propres messages (sender = soi).
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert to authenticated
  with check (auth.uid() = sender_id);

-- On lit : ses DM (émis ou reçus) + tous les messages de groupe.
-- NB : la liste des groupes étant gérée côté client, les messages de
-- groupe sont lisibles par tout compte authentifié ; l'application
-- filtre ensuite selon les groupes auxquels on appartient. Pour un
-- cloisonnement strict des groupes, ajoutez une table d'adhésion
-- et remplacez la dernière condition par un EXISTS.
drop policy if exists "chat_messages_select_party" on public.chat_messages;
create policy "chat_messages_select_party" on public.chat_messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or conv_kind = 'group'
  );

-- ---------- Temps réel ----------
-- Ajoute la table à la publication Realtime (ignore si déjà fait).
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
--  FIN — Rechargez votre site. Les messages privés et de groupe
--  circulent maintenant réellement entre les membres, et sont
--  conservés (historique + hors ligne).
-- ============================================================
