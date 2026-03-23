alter table user_data
  add column if not exists location            text,
  add column if not exists website_url         text,
  add column if not exists website_label       text,
  add column if not exists twitter_handle      text,
  add column if not exists letterboxd_username text;
