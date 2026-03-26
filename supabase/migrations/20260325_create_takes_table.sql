-- Takes: short-form posts (280 chars) anchored to a TMDB film.
-- Denormalizes movie_title + poster_path to avoid TMDB round-trips when rendering.
create table takes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  tmdb_id       integer not null,
  movie_title   text not null,
  poster_path   text,
  content       text not null check (char_length(content) <= 280),
  created_at    timestamptz default now()
);

-- Index for user profile queries (newest first)
create index idx_takes_user_id on takes (user_id, created_at desc);

-- Index for film card queries (all takes about a film)
create index idx_takes_tmdb_id on takes (tmdb_id, created_at desc);

-- RLS: anyone can read takes, only the author can insert/delete their own
alter table takes enable row level security;

create policy "Takes are publicly readable"
  on takes for select
  using (true);

create policy "Users can insert their own takes"
  on takes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own takes"
  on takes for delete
  using (auth.uid() = user_id);
