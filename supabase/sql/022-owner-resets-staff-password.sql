-- 022 — the owner resets a staff member's password (ticket 46)
--
-- When staff forget their password, the owner gives them a new temporary
-- one, as when adding them. Passwords are still never readable: the owner
-- types a NEW one and tells the staff member; nobody can see the old one.
--
-- reset_staff_password(staff_id, new_password):
--   * only the shop's owner, only for current staff of that shop (never
--     the owner, never a removed person, never anyone in another shop)
--   * at least 8 characters (at most 72, bcrypt's limit)
--   * stores it scrambled the way Supabase does (bcrypt), so the normal
--     sign-in accepts it
--   * signs them out everywhere, so a lost phone or the old password
--     stops working; they sign in again with the new one
--
-- Why it is done here: Supabase's own "set a user's password" needs the
-- service_role key, which this project never uses. So this writes the
-- scrambled password into auth.users directly. That is Supabase's own
-- table: if a future Supabase update changes it, this function is the one
-- place to fix. Staff still change their own password on Account, the
-- normal way.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 021 first.

begin;

create or replace function reset_staff_password(staff_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can reset staff passwords.';
  end if;
  if not exists (
    select 1 from public.shop_members
    where technician_id = staff_id
      and shop_id = public.my_shop_id()
      and role = 'apprentice'
      and removed_at is null
  ) then
    raise exception 'That person is not staff in your shop.';
  end if;
  if new_password is null or char_length(new_password) < 8 then
    raise exception 'Use at least 8 characters.';
  end if;
  if octet_length(new_password) > 72 then
    raise exception 'Use at most 72 characters.';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = staff_id;

  -- Sign them out everywhere (their refresh tokens go with the sessions).
  delete from auth.sessions where user_id = staff_id;
end;
$$;

revoke all on function reset_staff_password(uuid, text) from public, anon;
grant execute on function reset_staff_password(uuid, text) to authenticated;

commit;
