-- 007 — invite codes and apprentice limits (phase 2, ticket 12)
--
-- Lets apprentices join a shop with the owner's invite code, and makes
-- the database itself enforce what apprentices may change.
--   1. shop_invites: the shop's current code, readable by the owner only
--   2. new_invite_code(): owner only; the old code stops working
--   3. join_shop(code): makes the caller an apprentice
--   4. a trigger limiting what apprentices may change on a job
--   5. tidy-up: only signed-in users may call our helper functions
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 006 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Invite codes ---------------------------------------------------
--
-- 8 characters, easy to read out loud and type: no 0/O or 1/I. About a
-- trillion possibilities, so guessing one is not realistic.

create or replace function random_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

create table if not exists shop_invites (
  shop_id    uuid        primary key references shops (id) on delete cascade,
  code       text        not null unique default random_invite_code(),
  created_at timestamptz not null default now()
);

-- Only the owner can see the code. There are deliberately no insert,
-- update or delete policies: codes only change through
-- new_invite_code() below. Apprentices never see the code, so they
-- cannot pass it on.
alter table shop_invites enable row level security;

drop policy if exists "Owners can read their invite code" on shop_invites;
create policy "Owners can read their invite code"
  on shop_invites for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

-- Every existing shop gets a code.
insert into shop_invites (shop_id)
select id from shops
on conflict (shop_id) do nothing;

-- 2. Make a new code (owner only) -----------------------------------

create or replace function new_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
  fresh text;
begin
  if shop is null or not public.i_own_my_shop() then
    raise exception 'Only the shop owner can change the invite code.';
  end if;

  insert into public.shop_invites (shop_id, code, created_at)
  values (shop, public.random_invite_code(), now())
  on conflict (shop_id) do update
    set code = excluded.code, created_at = excluded.created_at
  returning code into fresh;

  return fresh;
end;
$$;

-- "Start a shop" now also makes the shop's first invite code.
create or replace function start_shop(shop_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_shop uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.technicians where id = auth.uid()) then
    raise exception 'Save your name and contact number first.';
  end if;
  if exists (select 1 from public.shop_members where technician_id = auth.uid()) then
    raise exception 'You are already in a shop.';
  end if;

  insert into public.shops (name, owner_id)
  values (trim(shop_name), auth.uid())
  returning id into new_shop;

  insert into public.shop_members (technician_id, shop_id, role)
  values (auth.uid(), new_shop, 'owner');

  insert into public.shop_invites (shop_id) values (new_shop);

  return new_shop;
end;
$$;

-- 3. Join a shop ----------------------------------------------------
--
-- A correct code makes the caller an apprentice of that shop. Spaces,
-- dashes and lower case are forgiven, so "abcd-efgh" works.

create or replace function join_shop(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.technicians where id = auth.uid()) then
    raise exception 'Save your name and contact number first.';
  end if;
  if exists (select 1 from public.shop_members where technician_id = auth.uid()) then
    raise exception 'You are already in a shop.';
  end if;

  select shop_id into shop
  from public.shop_invites
  where code = upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if shop is null then
    raise exception 'That invite code does not match any shop. Check it with the shop owner.';
  end if;

  insert into public.shop_members (technician_id, shop_id, role)
  values (auth.uid(), shop, 'apprentice');

  return shop;
end;
$$;

-- 4. What apprentices may change ------------------------------------
--
-- RLS already stops an apprentice touching a job they do not handle.
-- This trigger stops them changing anything on their own jobs except
-- status, notes, parts replaced and promised date. It compares the
-- whole row, so any column added later is protected automatically.
-- Owners, and the database itself (no signed-in user), are not limited.

create or replace function limit_apprentice_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed public.jobs;
begin
  if auth.uid() is null or public.i_own_my_shop() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.revised_estimate is not null then
      raise exception 'Only the shop owner can set a revised estimate.';
    end if;
    return new;
  end if;

  -- Start from the new row, put back everything an apprentice MAY
  -- change, and anything still different is not allowed.
  allowed := new;
  allowed.status := old.status;
  allowed.notes := old.notes;
  allowed.parts_replaced := old.parts_replaced;
  allowed.promised_date := old.promised_date;
  allowed.updated_at := old.updated_at;
  allowed.tracking_code := old.tracking_code;

  if allowed is distinct from old then
    raise exception 'Apprentices can only change the status, notes, parts replaced and promised date.';
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_limit_apprentice_changes on jobs;
create trigger jobs_limit_apprentice_changes
  before insert or update on jobs
  for each row execute function limit_apprentice_changes();

-- 5. Who may call what ----------------------------------------------
--
-- Supabase lets signed-out visitors call new functions by default.
-- None of these are for them (they already refuse, but say so plainly).

revoke all on function random_invite_code() from public, anon, authenticated;
revoke all on function limit_apprentice_changes() from public, anon, authenticated;

revoke all on function my_shop_id() from public, anon;
revoke all on function i_own_my_shop() from public, anon;
revoke all on function start_shop(text) from public, anon;
revoke all on function new_invite_code() from public, anon;
revoke all on function join_shop(text) from public, anon;

grant execute on function my_shop_id() to authenticated;
grant execute on function i_own_my_shop() to authenticated;
grant execute on function start_shop(text) to authenticated;
grant execute on function new_invite_code() to authenticated;
grant execute on function join_shop(text) to authenticated;

commit;
