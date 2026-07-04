-- ============================================================
--  CENSA — Patch « réactions partagées »
--  À coller dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : sans danger si relancé.
--
--  Avant ce patch, les réactions (J'adhère, J'adore, Haha, Wouah,
--  Triste, Grr) sur une publication n'étaient enregistrées que dans
--  le navigateur de la personne qui réagissait : invisibles pour
--  tout le monde d'autre, et perdues au moindre nettoyage du
--  navigateur.
--
--  Ce patch crée une vraie table PARTAGÉE : une réaction posée par
--  A est désormais vue par TOUS les membres (compteur total sur la
--  publication), et chacun ne garde qu'UNE réaction par publication
--  (en changer remplace la précédente, la retirer l'efface).
-- ============================================================

create table if not exists public.reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reaction   text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_reactions_post on public.reactions(post_id);

alter table public.reactions enable row level security;

drop policy if exists "reactions_read"   on public.reactions;
drop policy if exists "reactions_insert" on public.reactions;
drop policy if exists "reactions_update" on public.reactions;
drop policy if exists "reactions_delete" on public.reactions;

-- Lisibles par tout le monde (comme les publications elles-mêmes).
create policy "reactions_read"   on public.reactions for select using (true);
-- Chacun ne peut poser/modifier/retirer que SA PROPRE réaction.
create policy "reactions_insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_update" on public.reactions for update using (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.reactions to anon, authenticated;

-- Réplication temps réel (pour que le compteur bouge chez tout le
-- monde sans recharger la page) — sans danger si déjà activé.
do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null;
end $$;

-- ============================================================
--  FIN — Après exécution : les réactions sont partagées, comptées
--  pour tout le monde, et mises à jour en direct.
-- ============================================================
