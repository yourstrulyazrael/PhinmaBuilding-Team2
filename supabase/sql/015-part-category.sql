-- 015 — part categories (ticket 32)
--
-- A free-text category per part (Screens, Batteries, Charging ports…),
-- shown and searchable on Inventory and included in import/export.
-- Readable by the shop, written by the owner, like the rest of a part
-- (the policies from 013 already cover it).
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 013 first.

alter table parts add column if not exists category text not null default ''
  check (char_length(category) <= 50);
