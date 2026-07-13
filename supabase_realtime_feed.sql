-- ============================================================
--  CENSA — PATCH TEMPS RÉEL : fil (publications + stories + réponses)
--  À coller dans : Supabase → SQL Editor → New query → Run
--  Idempotent : sans danger si relancé.
--
--  Pourquoi ce patch ?
--    Le site écoute désormais Supabase Realtime pour afficher SANS
--    rechargement les nouvelles publications, stories et réponses
--    (commentaires) publiées par les ami(e)s. Pour que la livraison
--    instantanée fonctionne, ces tables doivent appartenir à la
--    publication « supabase_realtime ».
--
--  Astuce : vous pouvez aussi cocher ces tables dans
--    Supabase → Database → Replication → supabase_realtime.
--  Ce script fait exactement la même chose, en SQL.
-- ============================================================

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.stories;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;

-- ============================================================
--  FIN — Rechargez votre site. Les publications, stories et
--  réponses des ami(e)s apparaissent maintenant en direct.
-- ============================================================
