-- ============================================================
--  CENSA — Patch 6 : corrige le partage des GROUPES
--  À coller dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : sans danger si relancé.
--
--  PROBLÈME TROUVÉ : la table public.groups a été créée avec une
--  colonne "owner_id", mais l'application écrit/lit "author_id"
--  (comme pour les publications, le market, l'emploi…). Résultat :
--  chaque création de groupe échouait silencieusement côté Supabase
--  et l'app retombait sur un stockage 100% local — donc invisible
--  pour tout le monde d'autre, même les groupes "publics".
-- ============================================================

-- 1) Ajoute la colonne que l'app utilise réellement.
alter table public.groups add column if not exists author_id uuid references public.profiles(id) on delete set null;

-- 2) Corrige les règles d'accès (RLS) pour s'appuyer sur author_id.
drop policy if exists "groups_read"   on public.groups;
drop policy if exists "groups_insert" on public.groups;
drop policy if exists "groups_update" on public.groups;
drop policy if exists "groups_delete" on public.groups;

create policy "groups_read"   on public.groups for select using (true);
create policy "groups_insert" on public.groups for insert with check (auth.uid() = author_id);
-- Mise à jour ouverte à tout membre connecté (fil de discussion, ajout/retrait
-- de membres par n'importe quel participant) — comme le reste de l'app.
create policy "groups_update" on public.groups for update
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "groups_delete" on public.groups for delete using (auth.uid() = author_id);

grant select, insert, update, delete on public.groups to anon, authenticated;

-- 3) Réplication temps réel (pour que le groupe apparaisse en direct chez
--    les autres membres, sans recharger la page) — sans danger si déjà activé.
do $$ begin
  alter publication supabase_realtime add table public.groups;
exception when duplicate_object then null;
end $$;

-- ============================================================
--  FIN — Après exécution : créez un nouveau groupe (les anciens,
--  jamais réellement enregistrés côté serveur, resteront locaux à
--  l'appareil qui les a créés) ; il sera désormais visible par tous.
-- ============================================================
