-- 011 — the owner creates staff accounts (ticket 22)
--
-- Replaces the invite code from 007. The app creates the staff
-- member's account with the normal sign-up (no service_role key), saves
-- their name with their own session, and then the owner calls
-- add_staff to put them in the shop.
--
--   1. add_staff(staff_id): owner only; only a brand-new account
--   2. remove the invite code: shop_invites, join_shop, new_invite_code
--   3. start_shop no longer makes an invite code
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 007 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Add staff ------------------------------------------------------
--
-- Only the shop's owner may call it, and only for an account that
--   * was created in the last 10 minutes (i.e. just now, by the app),
--   * has saved its name and contact, and
--   * is not in any shop.
-- So nobody can use it to pull an existing, unrelated account into
-- their shop.

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

-- 2. Remove the invite code -----------------------------------------

drop function if exists join_shop(text);
drop function if exists new_invite_code();
drop table if exists shop_invites;
drop function if exists random_invite_code();

-- 3. Start a shop, without an invite code ----------------------------

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

  return new_shop;
end;
$$;

commit;
