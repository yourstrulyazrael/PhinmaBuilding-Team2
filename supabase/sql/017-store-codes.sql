-- 017 — store codes: nobody can create an account on their own (ticket 35)
--
-- New accounts can only be made in two ways:
--   * a shop owner, with a STORE CODE the developer gave them. The code
--     works once, and lets that account start one shop.
--   * a staff member, created by their owner in Workspace → Staff. The
--     app first asks for a STAFF TICKET (a one-time pass, valid for 10
--     minutes, only for the owner's own shop) and sends it with the
--     sign-up.
-- Anything else is refused BY THE DATABASE, not just hidden in the app:
-- the Supabase key in the browser is public, so someone could call
-- sign-up directly. The check below runs inside Supabase's own sign-up
-- and cancels it.
--
-- Stores stay separate as before: every row belongs to a shop, and RLS
-- only shows people their own shop.
--
--   1. store_codes and staff_tickets (RLS on, no policies: the app can
--      never read or change them directly, only through the functions)
--   2. new_store_code(note): for the developer, in the SQL Editor only
--   3. the sign-up check (a trigger on auth.users)
--   4. new_staff_ticket(): owner only
--   5. start_shop needs a store code; add_staff needs a staff ticket
--
-- Existing accounts and shops are not affected.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 016 first. Keep "Allow new users to sign up" ON in Supabase
-- (Authentication -> Sign In / Providers): the gate is this file.
--
-- TO GIVE A STORE OWNER ACCESS (developer), run in the SQL Editor:
--     select new_store_code('Juan''s shop, Iloilo');
-- and send them the code it returns. To see every code and who used it:
--     select * from store_codes order by created_at desc;

begin;

-- 1. Tables ------------------------------------------------------------

create table if not exists store_codes (
  code        text        primary key,               -- 12 letters/digits, stored without dashes
  note        text        not null default '',       -- the developer's reminder of who it is for
  created_at  timestamptz not null default now(),
  claimed_by  uuid        references auth.users (id) on delete set null,
  claimed_at  timestamptz,                           -- set once; a code never works twice
  shop_id     uuid        references shops (id) on delete set null
);

create table if not exists staff_tickets (
  token       uuid        primary key default gen_random_uuid(),
  shop_id     uuid        not null references shops (id) on delete cascade,
  created_at  timestamptz not null default now(),
  used_by     uuid        references auth.users (id) on delete set null,
  used_at     timestamptz
);

-- RLS on, and deliberately NO policies: through the public API nobody
-- (not even a signed-in owner) can list, read or edit codes or tickets.
-- Only the security-definer functions below touch them.
alter table store_codes enable row level security;
alter table staff_tickets enable row level security;

-- 2. Make a store code (developer only) ---------------------------------
--
-- 12 random hex characters (from gen_random_uuid, which uses strong
-- randomness; hex has no O, I or L to misread), shown as XXXX-XXXX-XXXX.

create or replace function new_store_code(note text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
begin
  insert into public.store_codes (code, note) values (raw, coalesce(note, ''));
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4);
end;
$$;

-- Not callable from the app at all: only from the SQL Editor.
revoke all on function new_store_code(text) from public, anon, authenticated;

-- 3. The sign-up check -------------------------------------------------
--
-- Runs inside Supabase's sign-up, right after the account row is made.
-- Raising an error cancels the whole sign-up: no account is left behind.

create or replace function gate_sign_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  given_code text := upper(regexp_replace(coalesce(new.raw_user_meta_data ->> 'store_code', ''), '[^A-Za-z0-9]', '', 'g'));
  given_ticket text := coalesce(new.raw_user_meta_data ->> 'staff_ticket', '');
begin
  if given_code <> '' then
    update public.store_codes
      set claimed_by = new.id, claimed_at = now()
      where code = given_code and claimed_at is null;
    if not found then
      raise exception 'That store code is not valid or has already been used.';
    end if;
    return new;
  end if;

  if given_ticket <> '' then
    update public.staff_tickets
      set used_by = new.id, used_at = now()
      where token::text = given_ticket
        and used_at is null
        and created_at > now() - interval '10 minutes';
    if not found then
      raise exception 'That staff ticket is not valid. Please try again.';
    end if;
    return new;
  end if;

  raise exception 'Sign-ups are closed. Ask for a store code.';
end;
$$;

revoke all on function gate_sign_up() from public, anon, authenticated;

drop trigger if exists gate_sign_up on auth.users;
create trigger gate_sign_up
  after insert on auth.users
  for each row execute function gate_sign_up();

-- 4. A staff ticket (owner only) -----------------------------------------

create or replace function new_staff_ticket()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
  ticket uuid;
begin
  if shop is null or not public.i_own_my_shop() then
    raise exception 'Only the shop owner can add staff.';
  end if;
  insert into public.staff_tickets (shop_id) values (shop) returning token into ticket;
  return ticket;
end;
$$;

revoke all on function new_staff_ticket() from public, anon;
grant execute on function new_staff_ticket() to authenticated;

-- 5. start_shop and add_staff ---------------------------------------------

-- As in 011, plus: you must have signed up with a store code that has
-- not started a shop yet. The code is then tied to the new shop.
create or replace function start_shop(shop_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_code text;
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

  select code into my_code
    from public.store_codes
    where claimed_by = auth.uid() and shop_id is null
    limit 1
    for update;
  if my_code is null then
    raise exception 'You need a store code to start a shop. Ask the developer for one.';
  end if;

  insert into public.shops (name, owner_id)
  values (trim(shop_name), auth.uid())
  returning id into new_shop;

  insert into public.shop_members (technician_id, shop_id, role)
  values (auth.uid(), new_shop, 'owner');

  update public.store_codes set shop_id = new_shop where code = my_code;

  return new_shop;
end;
$$;

-- As in 011, plus: the account must have been made with a staff ticket
-- from THIS shop.
create or replace function add_staff(staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
begin
  if shop is null or not public.i_own_my_shop() then
    raise exception 'Only the shop owner can add staff.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = staff_id and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Only a newly created account can be added. Please try again.';
  end if;
  if not exists (
    select 1 from public.staff_tickets where used_by = staff_id and shop_id = shop
  ) then
    raise exception 'That account was not created from your shop.';
  end if;
  if not exists (select 1 from public.technicians where id = staff_id) then
    raise exception 'The new account has no name and contact saved yet.';
  end if;
  if exists (select 1 from public.shop_members where technician_id = staff_id) then
    raise exception 'That account is already in a shop.';
  end if;

  insert into public.shop_members (technician_id, shop_id, role)
  values (staff_id, shop, 'apprentice');
end;
$$;

revoke all on function add_staff(uuid) from public, anon;
grant execute on function add_staff(uuid) to authenticated;

commit;
