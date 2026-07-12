-- ============================================================
--  CENSA — RÉINITIALISATION (avant lancement)
--  À coller dans : Supabase → SQL Editor → New query → Run
--
--  ⚠️  ATTENTION : EFFACE TOUT.
--      · tous les comptes (auth.users) → y compris les comptes
--        de test « exemples » (Feed Test, Story T, A, B…)
--      · tout le contenu (posts, stories, market, groupes,
--        messages, profils, états…) par cascade
--      · tous les médias téléversés (Storage)
--
--  Résultat : un site totalement vierge, prêt pour le lancement.
--  Vos utilisateurs créeront ensuite leurs vrais comptes.
-- ============================================================

-- 1) Supprime TOUS les comptes — cascade vers profiles, posts,
--    stories, market_items, groups, user_state, etc.
delete from auth.users;

-- 2) Vide les médias stockés (photos / vidéos / avatars / CV)
delete from storage.objects
where bucket_id in ('avatars', 'media', 'videos', 'cv');

-- ============================================================
--  FIN — Base CENSA remise à zéro.
-- ============================================================


-- ------------------------------------------------------------
--  VARIANTE : garder VOTRE compte et ne supprimer QUE les
--  comptes de test. Décommentez et remplacez votre e-mail.
-- ------------------------------------------------------------
-- delete from auth.users
-- where email <> 'votre-vrai-email@exemple.com';
-- delete from storage.objects where bucket_id in ('avatars','media','videos','cv');
