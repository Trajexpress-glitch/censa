-- ============================================================
--  CENSA — Schéma Supabase (PostgreSQL)
--  À coller dans : Supabase → SQL Editor → New query → Run
--
--  Couvre tous les modules du site :
--    comptes, publications, commentaires, stories, vidéos,
--    messages, groupes, pages, ami(e)s, invitations,
--    emploi + candidatures, market, notifications, aide.
--
--  Sécurité : Row Level Security (RLS) activée partout.
--  Le contenu est lisible publiquement ; chacun ne peut
--  modifier/supprimer que SES propres lignes.
--  À exécuter une seule fois. Sans danger si relancé.
-- ============================================================

-- Extensions utiles (déjà présentes sur Supabase en général)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
--  Fonction utilitaire : maj automatique de updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
--  1) PROFILS  (remplace censa_account)
--     Lié à l'authentification Supabase (auth.users).
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  handle     text unique,
  email      text,
  verified   boolean not null default false,
  hue        int not null default 196,
  score      int not null default 100,
  observers  int not null default 0,
  joined     text,
  bio_fr     text default '',
  bio_en     text default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, handle, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'handle',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  2) PUBLICATIONS  (censa_posts) + commentaires + likes
-- ============================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  text_fr     text default '',
  text_en     text default '',
  media       jsonb,                       -- { type, key, url }
  visibility  text not null default 'friends',  -- 'friends' | 'public'
  watched     int not null default 0,
  likes       int not null default 0,
  reposts     int not null default 0,
  delta       int not null default 0,
  flagged     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_posts_author  on public.posts(author_id);
create index if not exists idx_posts_created on public.posts(created_at desc);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_post on public.comments(post_id);

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================
--  3) STORIES  (censa_stories)
-- ============================================================
create table if not exists public.stories (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  slides     jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);
create index if not exists idx_stories_author on public.stories(author_id);

-- ============================================================
--  4) VIDÉOS  (censa_videos)
-- ============================================================
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text default '',
  media       jsonb,                       -- { key, url, thumb, duration... }
  views       int not null default 0,
  likes       int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_videos_author on public.videos(author_id);

-- ============================================================
--  5) MESSAGERIE  (censa_chats) — conversations + messages
--     Une conversation = un ami (1:1) ou un groupe.
-- ============================================================
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  is_group   boolean not null default false,
  title      text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  text            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- ============================================================
--  6) GROUPES  (censa_groups)
-- ============================================================
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid references public.profiles(id) on delete set null,
  cover      text,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member',  -- 'owner' | 'admin' | 'member'
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ============================================================
--  7) PAGES  (censa_pages)
-- ============================================================
create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  category    text,
  description text,
  logo        text,
  cover       text,
  contacts    jsonb,                        -- { phone, email, site, address... }
  created_at  timestamptz not null default now()
);

create table if not exists public.page_followers (
  page_id    uuid not null references public.pages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

-- ============================================================
--  8) AMI(E)S  (censa_friends) + invitations (censa_invites)
-- ============================================================
create table if not exists public.friendships (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  friend_id  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'accepted', -- 'pending' | 'accepted' | 'blocked'
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references public.profiles(id) on delete cascade,
  to_user      uuid references public.profiles(id) on delete cascade,
  to_email     text,
  status       text not null default 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at   timestamptz not null default now()
);

-- ============================================================
--  9) EMPLOI  (censa_jobs) + candidatures (censa_applications)
-- ============================================================
create table if not exists public.jobs (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  company        text,
  location       text,
  type           text,                      -- CDI, CDD, freelance...
  salary         text,
  description    text,
  featured_until timestamptz,               -- mise en avant payante
  created_at     timestamptz not null default now()
);
create index if not exists idx_jobs_created on public.jobs(created_at desc);

create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid references public.profiles(id) on delete set null,
  name         text,
  email        text,
  message      text,
  cv_url       text,                        -- fichier dans le bucket 'cv'
  created_at   timestamptz not null default now()
);
create index if not exists idx_applications_job on public.job_applications(job_id);

-- ============================================================
--  10) MARKET  (censa_market)
-- ============================================================
create table if not exists public.market_items (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  price          numeric,
  currency       text default 'EUR',
  category       text default 'other',      -- tech, home, fashion, vehicles...
  description    text,
  location       text,
  photos         jsonb default '[]'::jsonb, -- [ { key, url } ]
  featured_until timestamptz,
  sold           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_market_created  on public.market_items(created_at desc);
create index if not exists idx_market_category on public.market_items(category);

-- ============================================================
--  11) NOTIFICATIONS  +  AIDE  (censa_help)
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text,
  data       jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifs_user on public.notifications(user_id, created_at desc);

create table if not exists public.help_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  question   text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  12) ÉTAT UTILISATEUR  (user_state)
--      Sauvegarde par compte de l'état de l'app (publications,
--      stories, vidéos, messages, groupes, pages, emploi,
--      market…) sous forme d'un seul JSONB. Utilisé par la
--      synchronisation automatique côté site (supabase.jsx).
-- ============================================================
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Active RLS sur toutes les tables et pose les règles d'accès.
-- ============================================================
alter table public.user_state           enable row level security;
alter table public.profiles             enable row level security;
alter table public.posts                enable row level security;
alter table public.comments             enable row level security;
alter table public.post_likes           enable row level security;
alter table public.stories              enable row level security;
alter table public.videos               enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.pages                enable row level security;
alter table public.page_followers       enable row level security;
alter table public.friendships          enable row level security;
alter table public.invites              enable row level security;
alter table public.jobs                 enable row level security;
alter table public.job_applications     enable row level security;
alter table public.market_items         enable row level security;
alter table public.notifications        enable row level security;
alter table public.help_requests        enable row level security;

-- ---- PROFILS : lisibles par tous, modifiables par le propriétaire ----
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- ---- Contenu PUBLIC en lecture, écriture réservée au propriétaire ----
-- POSTS
create policy "posts_read"   on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts_update" on public.posts for update using (auth.uid() = author_id);
create policy "posts_delete" on public.posts for delete using (auth.uid() = author_id);

-- COMMENTAIRES
create policy "comments_read"   on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = author_id);

-- LIKES
create policy "likes_read"   on public.post_likes for select using (true);
create policy "likes_insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.post_likes for delete using (auth.uid() = user_id);

-- STORIES
create policy "stories_read"   on public.stories for select using (true);
create policy "stories_insert" on public.stories for insert with check (auth.uid() = author_id);
create policy "stories_delete" on public.stories for delete using (auth.uid() = author_id);

-- VIDÉOS
create policy "videos_read"   on public.videos for select using (true);
create policy "videos_insert" on public.videos for insert with check (auth.uid() = author_id);
create policy "videos_update" on public.videos for update using (auth.uid() = author_id);
create policy "videos_delete" on public.videos for delete using (auth.uid() = author_id);

-- ---- MESSAGERIE : réservée aux membres de la conversation ----
create policy "conv_read" on public.conversations for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = id and m.user_id = auth.uid()));
create policy "conv_insert" on public.conversations for insert
  with check (auth.uid() = created_by);

create policy "convmem_read" on public.conversation_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation_members.conversation_id and m.user_id = auth.uid()));
create policy "convmem_insert" on public.conversation_members for insert
  with check (auth.uid() is not null);

create policy "messages_read" on public.messages for select
  using (exists (select 1 from public.conversation_members m
                 where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));
create policy "messages_insert" on public.messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from public.conversation_members m
    where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()));

-- ---- GROUPES ----
create policy "groups_read"   on public.groups for select using (true);
create policy "groups_insert" on public.groups for insert with check (auth.uid() = owner_id);
create policy "groups_update" on public.groups for update using (auth.uid() = owner_id);
create policy "groups_delete" on public.groups for delete using (auth.uid() = owner_id);

create policy "gmembers_read"   on public.group_members for select using (true);
create policy "gmembers_insert" on public.group_members for insert with check (auth.uid() = user_id or auth.uid() in (
  select owner_id from public.groups g where g.id = group_id));
create policy "gmembers_delete" on public.group_members for delete using (auth.uid() = user_id or auth.uid() in (
  select owner_id from public.groups g where g.id = group_id));

-- ---- PAGES ----
create policy "pages_read"   on public.pages for select using (true);
create policy "pages_insert" on public.pages for insert with check (auth.uid() = owner_id);
create policy "pages_update" on public.pages for update using (auth.uid() = owner_id);
create policy "pages_delete" on public.pages for delete using (auth.uid() = owner_id);

create policy "pfollow_read"   on public.page_followers for select using (true);
create policy "pfollow_insert" on public.page_followers for insert with check (auth.uid() = user_id);
create policy "pfollow_delete" on public.page_followers for delete using (auth.uid() = user_id);

-- ---- AMI(E)S & INVITATIONS ----
create policy "friend_read"   on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friend_insert" on public.friendships for insert with check (auth.uid() = user_id);
create policy "friend_delete" on public.friendships for delete using (auth.uid() = user_id);

create policy "invite_read"   on public.invites for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy "invite_insert" on public.invites for insert with check (auth.uid() = from_user);
create policy "invite_update" on public.invites for update using (auth.uid() = to_user or auth.uid() = from_user);

-- ---- EMPLOI ----
create policy "jobs_read"   on public.jobs for select using (true);
create policy "jobs_insert" on public.jobs for insert with check (auth.uid() = author_id);
create policy "jobs_update" on public.jobs for update using (auth.uid() = author_id);
create policy "jobs_delete" on public.jobs for delete using (auth.uid() = author_id);

-- Candidatures : visibles par le candidat et par l'auteur de l'offre.
create policy "apps_read" on public.job_applications for select
  using (auth.uid() = applicant_id or auth.uid() in (
    select author_id from public.jobs j where j.id = job_id));
create policy "apps_insert" on public.job_applications for insert
  with check (auth.uid() = applicant_id or applicant_id is null);

-- ---- MARKET ----
create policy "market_read"   on public.market_items for select using (true);
create policy "market_insert" on public.market_items for insert with check (auth.uid() = author_id);
create policy "market_update" on public.market_items for update using (auth.uid() = author_id);
create policy "market_delete" on public.market_items for delete using (auth.uid() = author_id);

-- ---- NOTIFICATIONS & AIDE ----
create policy "notifs_read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notifs_insert" on public.notifications for insert with check (true);
create policy "notifs_update" on public.notifications for update using (auth.uid() = user_id);

create policy "help_insert" on public.help_requests for insert with check (true);
create policy "help_read"   on public.help_requests for select using (auth.uid() = user_id);

-- ---- ÉTAT UTILISATEUR : chacun ne lit/écrit que le sien ----
create policy "ustate_all" on public.user_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  DROITS D'ACCÈS (rôles anon / authenticated)
--  La sécurité fine reste assurée par les politiques RLS.
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- ============================================================
--  STOCKAGE DE FICHIERS (Storage)
--  Crée les "buckets" pour les images, vidéos, CV.
--  (Les règles d'accès Storage se configurent dans
--   l'onglet Storage → Policies, ou via SQL ci-dessous.)
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('media',   'media',   true),
  ('videos',  'videos',  true),
  ('cv',      'cv',      false)
on conflict (id) do nothing;

-- Lecture publique des buckets publics
create policy "public_read_avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "public_read_media"   on storage.objects for select using (bucket_id = 'media');
create policy "public_read_videos"  on storage.objects for select using (bucket_id = 'videos');

-- Upload réservé aux utilisateurs connectés
create policy "auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','media','videos','cv'));

-- ============================================================
--  FIN — Schéma CENSA prêt à l'emploi.
-- ============================================================
