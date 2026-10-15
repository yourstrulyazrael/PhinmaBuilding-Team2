-- 018 — the owner sees their staff's sign-in details (ticket 36)
--
-- Emails and sign-in times live in Supabase's auth.users table, which
-- the app cannot read (and must not: it holds everyone's accounts).
-- This function hands the OWNER just three things about the people in
-- THEIR OWN shop: email, when the account was made, and when they last
-- signed in. Anyone else gets nothing.
--
-- Passwords are not here because they cannot be: Supabase keeps only a
-- one-way scrambled version (a hash), never the password itself.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 017 first.

begin;

create or replace function shop_staff_accounts()
returns table (
  id              uuid,
  email           text,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can see staff accounts.';
  end if;

  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from public.shop_members m
    join auth.users u on u.id = m.technician_id
    where m.shop_id = public.my_shop_id();
end;
$$;

revoke all on function shop_staff_accounts() from public, anon;
grant execute on function shop_staff_accounts() to authenticated;

commit;
