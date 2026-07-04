-- ============================================================
--  CENSA — PATCH 2 : contenu partagé entre utilisateurs
--  À coller dans : Supabase → SQL Editor → New query → Run
--  Sans danger, peut être relancé.
-- ============================================================

-- Colonnes « data » : conservent l'objet riche/bilingue de l'app
alter table public.market_items add column if not exists data jsonb;
alter table public.groups       add column if not exists data jsonb;

-- Les groupes sont partagés : tout membre connecté peut publier
-- dans le fil de discussion (et pas seulement le créateur).
drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- Buckets de stockage des médias (idempotent)
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true), ('media','media',true),
  ('videos','videos',true),   ('cv','cv',false)
on conflict (id) do nothing;

-- Politiques Storage (recréées proprement)
drop policy if exists "public_read_avatars" on storage.objects;
drop policy if exists "public_read_media"   on storage.objects;
drop policy if exists "public_read_videos"  on storage.objects;
drop policy if exists "auth_upload"         on storage.objects;
create policy "public_read_avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public_read_media"   on storage.objects for select using (bucket_id = 'media');
create policy "public_read_videos"  on storage.objects for select using (bucket_id = 'videos');
create policy "auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','media','videos','cv'));

-- ============================================================
--  FIN — Rechargez votre site : posts, stories, market et
--  groupes sont désormais partagés et visibles dans Supabase.
-- ============================================================
