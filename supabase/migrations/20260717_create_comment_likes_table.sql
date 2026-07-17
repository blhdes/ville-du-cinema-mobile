-- Likes on Comments: one like per user per comment (composite PK).
-- Mirrors take_likes. `on delete cascade` so deleting a comment
-- automatically removes its likes (comments are deletable in the UI).
create table comment_likes (
  user_id    uuid references auth.users not null,
  comment_id uuid references take_comments on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, comment_id)
);

-- Fast count queries: "how many likes does this comment have?"
create index idx_comment_likes_comment_id on comment_likes (comment_id);

alter table comment_likes enable row level security;

create policy "Authenticated users can read all comment likes"
  on comment_likes for select
  to authenticated
  using (true);

create policy "Users can insert their own comment likes"
  on comment_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own comment likes"
  on comment_likes for delete
  to authenticated
  using (auth.uid() = user_id);
