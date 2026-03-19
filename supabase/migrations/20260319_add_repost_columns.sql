-- Add repost support to user_clippings.
-- `type` discriminates between regular clippings ('quote') and reposts ('repost').
-- `review_json` stores the full Review object for reposts.
ALTER TABLE user_clippings
  ADD COLUMN type text NOT NULL DEFAULT 'quote',
  ADD COLUMN review_json jsonb;
