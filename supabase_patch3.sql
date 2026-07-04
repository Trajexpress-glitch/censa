-- ============================================================
--  CENSA — Patch 3 : Pages & Emploi PARTAGÉS entre tous les membres
--  (menu Pages en haut, dernières pages dans la colonne de droite,
--   annonces d'emploi visibles par tous)
--  À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- Colonnes « data » : conservent l'objet riche/bilingue de l'app
-- (mêmes clés que censa_pages / censa_jobs en localStorage).
alter table public.pages add column if not exists data jsonb;
alter table public.jobs  add column if not exists data jsonb;

-- Le follow (abonnement) et le compteur d'abonnés d'une page sont
-- mis à jour par des membres autres que le propriétaire → on
-- autorise toute mise à jour par un membre connecté (comme pour
-- les groupes, cf. supabase_patch2.sql).
drop policy if exists "pages_update" on public.pages;
create policy "pages_update" on public.pages for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============================================================
--  FIN — Patch 3 prêt à l'emploi.
-- ============================================================
