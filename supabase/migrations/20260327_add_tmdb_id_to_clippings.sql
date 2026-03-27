-- ============================================================
-- Phase 6 — Film-Anchored Clippings
-- Add tmdb_id to user_clippings so clippings can surface on Film Cards.
-- Nullable: existing clippings without a tmdb_id still work normally.
-- ============================================================

alter table user_clippings
  add column tmdb_id integer;

-- Index for "show me all clippings about this film" queries
create index idx_user_clippings_tmdb_id
  on user_clippings (tmdb_id, created_at desc)
  where tmdb_id is not null;
