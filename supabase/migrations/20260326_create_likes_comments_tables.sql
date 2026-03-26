-- Likes on Takes: one like per user per take (composite PK).
create table take_likes (
  user_id    uuid references auth.users not null,
  take_id    uuid references takes not null,
  created_at timestamptz default now(),
  primary key (user_id, take_id)
);

-- Fast count queries: "how many likes does this take have?"
create index idx_take_likes_take_id on take_likes (take_id);

alter table take_likes enable row level security;

create policy "Authenticated users can read all likes"
  on take_likes for select
  to authenticated
  using (true);

create policy "Users can insert their own likes"
  on take_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on take_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- --------------------------------------------------------

-- Comments on Takes: flat thread, 280-char limit.
create table take_comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  take_id    uuid references takes not null,
  content    text not null check (char_length(content) <= 280),
  created_at timestamptz default now()
);

-- Threaded reads: oldest-first for a given take
create index idx_take_comments_take_id on take_comments (take_id, created_at asc);

alter table take_comments enable row level security;

create policy "Authenticated users can read all comments"
  on take_comments for select
  to authenticated
  using (true);

create policy "Users can insert their own comments"
  on take_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on take_comments for delete
  to authenticated
  using (auth.uid() = user_id);
