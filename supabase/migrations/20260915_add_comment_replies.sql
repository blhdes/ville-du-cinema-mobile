-- Single-level replies on Take comments: a comment can have a parent_comment_id
-- pointing at another comment, but the UI never lets a reply itself be replied
-- to, so nesting never goes deeper than one level in practice.

alter table take_comments add column parent_comment_id uuid references take_comments(id) on delete cascade;

create index idx_take_comments_parent_id on take_comments (parent_comment_id, created_at asc);
