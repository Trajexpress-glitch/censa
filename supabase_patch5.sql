-- ============================================================
--  CENSA — Patch « photo de couverture partagée »
--  À coller dans : Supabase → SQL Editor → New query → Run.
--  Idempotent : sans danger si relancé.
--
--  La table des profils n'avait pas de colonne pour la photo de
--  couverture (seule la photo de profil possédait "avatar_url").
--  Sans colonne dédiée, la couverture ne pouvait jamais être
--  partagée entre appareils.
-- ============================================================

alter table public.profiles add column if not exists cover_url text;

-- ============================================================
--  FIN — Après exécution : la photo de couverture peut être
--  enregistrée et lue par tous les appareils du compte.
-- ============================================================
