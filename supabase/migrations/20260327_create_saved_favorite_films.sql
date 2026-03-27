-- ============================================================
-- Phase 5 — Watchlist (saved_films) & Favorite Films
-- ============================================================

-- Saved Films: "Want to watch" or "Seen it" per user per film
create table saved_films (
  user_id   uuid        references auth.users not null,
  tmdb_id   integer     not null,
  movie_title text      not null,
  poster_path text,
  status    text        not null check (status in ('want', 'seen')),
  saved_at  timestamptz default now(),
  primary key (user_id, tmdb_id)
);

-- Index for profile watchlist queries (user's films, newest first)
create index idx_saved_films_user
  on saved_films (user_id, saved_at desc);

-- RLS: anyone signed in can read; only the owner can insert/update/delete
alter table saved_films enable row level security;

create policy "Public read" on saved_films
  for select to authenticated using (true);

create policy "Owner insert" on saved_films
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Owner update" on saved_films
  for update to authenticated using (auth.uid() = user_id);

create policy "Owner delete" on saved_films
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================

-- Favorite Films: up to 4 films pinned on a user's profile
create table favorite_films (
  user_id   uuid        references auth.users not null,
  tmdb_id   integer     not null,
  movie_title text      not null,
  poster_path text,
  position  integer     not null check (position between 1 and 4),
  primary key (user_id, position)
);

-- Prevent the same film appearing twice for the same user
create unique index idx_favorite_films_unique_film
  on favorite_films (user_id, tmdb_id);

-- RLS: same pattern as saved_films
alter table favorite_films enable row level security;

create policy "Public read" on favorite_films
  for select to authenticated using (true);

create policy "Owner insert" on favorite_films
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Owner update" on favorite_films
  for update to authenticated using (auth.uid() = user_id);

create policy "Owner delete" on favorite_films
  for delete to authenticated using (auth.uid() = user_id);
