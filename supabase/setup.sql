-- SWDB — Supabase setup
--
-- One-shot, idempotent script that provisions everything the frontend needs:
-- the per-user tables (owned, collections, collection_members), their
-- row-level-security policies, and the public `covers` storage bucket with
-- its upload limit and access policies.
--
-- How to run:
--   • Dashboard: SQL Editor → New query → paste this file → Run.
--   • CLI:       supabase db execute --file supabase/setup.sql
--
-- Safe to re-run: every statement uses IF NOT EXISTS / DROP-then-CREATE or an
-- upsert, so running it again is a no-op (no data is dropped).
--
-- Note: `work_id` is the stable frozen catalog id from works.json. It is stored
-- as text (not a DB foreign key) — the catalog lives in static JSON, not in
-- Postgres, so referential integrity for works is the frontend's job.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Ownership: one row per (user, work) the user marks as owned.
create table if not exists public.owned (
  user_id    uuid not null references auth.users (id) on delete cascade,
  work_id    text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

-- Collections: user-defined groupings. Display/sort fields (eras, mediums,
-- series, authors, publishers, year range, anchor era, release date) are
-- DERIVED client-side from member works and are NOT stored here. Only the
-- user-set fields below are persisted.
create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  number     integer,
  -- Physical/media format. Frontend enum (COLLECTION_TYPES) is the source of
  -- truth: Hardcover, Softcover, Single Issue, TPB, Omnibus, DVD, Blu-ray.
  -- Intentionally a plain text column with no DB constraint.
  type       text,
  info_url   text,
  cover_url  text,
  created_at timestamptz not null default now()
);

-- Collection membership, with explicit ordering via `position`.
create table if not exists public.collection_members (
  collection_id uuid not null references public.collections (id) on delete cascade,
  work_id       text not null,
  position      integer not null default 0,
  primary key (collection_id, work_id)
);

create index if not exists collection_members_collection_id_idx
  on public.collection_members (collection_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.owned              enable row level security;
alter table public.collections        enable row level security;
alter table public.collection_members enable row level security;

-- owned: a user sees and mutates only their own rows.
drop policy if exists "owned: own rows" on public.owned;
create policy "owned: own rows" on public.owned
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- collections: a user sees and mutates only their own collections.
drop policy if exists "collections: own rows" on public.collections;
create policy "collections: own rows" on public.collections
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- collection_members: guarded transitively through the parent collection's owner.
drop policy if exists "collection_members: via owning collection" on public.collection_members;
create policy "collection_members: via owning collection" on public.collection_members
  for all
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: `covers` bucket
-- ---------------------------------------------------------------------------
--
-- Public read (cover images render for anonymous visitors), authenticated
-- write scoped to the user's own folder. Uploads are pathed `{user_id}/{uuid}.{ext}`,
-- so the first path segment must equal the uploader's id. 1 MB limit mirrors
-- the client-side check in the collection editor; images only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  1048576, -- 1 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone (including logged-out visitors) can read cover images.
drop policy if exists "covers: public read" on storage.objects;
create policy "covers: public read" on storage.objects
  for select
  using (bucket_id = 'covers');

-- Authenticated users may write only into their own `{user_id}/...` folder.
-- INSERT + UPDATE both required: the client uploads with `upsert: true`.
drop policy if exists "covers: owner insert" on storage.objects;
create policy "covers: owner insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers: owner update" on storage.objects;
create policy "covers: owner update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "covers: owner delete" on storage.objects;
create policy "covers: owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Keepalive heartbeat
-- ---------------------------------------------------------------------------
--
-- Free-tier Supabase projects are paused after ~7 days with no database
-- activity. A scheduled GitHub Action (.github/workflows/supabase-keepalive.yml)
-- calls keepalive_ping() every few days to keep the project awake.
--
-- keepalive_ping() is a SECURITY DEFINER function: it runs as its owner
-- (bypassing RLS), upserts the single heartbeat row, and returns the timestamp
-- it wrote. The upsert is a real database write — that is what registers as
-- activity — and the returned timestamp lets a caller confirm the write
-- landed. anon may only EXECUTE the function; it has no direct table access.

create table if not exists public.keepalive (
  id        smallint primary key,
  last_ping timestamptz not null default now()
);

alter table public.keepalive enable row level security;
-- No anon policy on the table: all access goes through keepalive_ping().

create or replace function public.keepalive_ping()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.keepalive (id, last_ping) values (1, now())
  on conflict (id) do update set last_ping = now()
  returning last_ping;
$$;

-- Only this function is exposed to anon; nothing else.
revoke all on function public.keepalive_ping() from public;
grant execute on function public.keepalive_ping() to anon;
