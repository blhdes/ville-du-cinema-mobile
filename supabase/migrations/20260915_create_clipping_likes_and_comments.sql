-- Likes + comments on Clippings.
--
-- Clippings don't have a single canonical row: every repost of a Clipping
-- inserts a brand-new `user_clippings` row (type='clipping-repost') rather
-- than referencing the original by id (see saveRepostClipping). Repost
-- status is already deduplicated by `original_url` (getBatchClippingRepostStatus),
-- so likes and comments key off `original_url` too — liking or commenting on
-- any repost of a quote hits the same shared thread as the original.

create table clipping_likes (
  user_id      uuid references auth.users not null,
  original_url text not null,
  created_at   timestamptz default now(),
  primary key (user_id, original_url)
);

create index idx_clipping_likes_original_url on clipping_likes (original_url);

alter table clipping_likes enable row level security;

create policy "Authenticated users can read all clipping likes"
  on clipping_likes for select
  to authenticated
  using (true);

create policy "Users can insert their own clipping likes"
  on clipping_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own clipping likes"
  on clipping_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- --------------------------------------------------------

create table clipping_comments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  original_url text not null,
  content      text not null check (char_length(content) <= 280),
  created_at   timestamptz default now()
);

create index idx_clipping_comments_original_url on clipping_comments (original_url, created_at asc);

alter table clipping_comments enable row level security;

create policy "Authenticated users can read all clipping comments"
  on clipping_comments for select
  to authenticated
  using (true);

create policy "Users can insert their own clipping comments"
  on clipping_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own clipping comments"
  on clipping_comments for delete
  to authenticated
  using (auth.uid() = user_id);
