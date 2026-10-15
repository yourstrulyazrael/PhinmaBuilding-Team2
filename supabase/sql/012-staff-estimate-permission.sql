-- 012 — staff can revise estimates, if the owner allows (ticket 23)
--
--   1. shop_members.can_revise_estimate, off by default
--   2. set_estimate_permission(staff_id, allowed): owner only
--   3. the apprentice limits let permitted staff change the revised
--      estimate on the jobs they handle
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 010 and 011 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. The permission -------------------------------------------------
--
-- shop_members still has no insert/update/delete policies, so nobody
-- can switch this directly, not even the owner: only the function below.

alter table shop_members add column if not exists can_revise_estimate boolean not null default false;

-- "May I set a revised estimate?" The owner always may.
create or replace function i_can_revise_estimate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid() and (role = 'owner' or can_revise_estimate)
  );
$$;

revoke all on function i_can_revise_estimate() from public, anon;
grant execute on function i_can_revise_estimate() to authenticated;

-- 2. The owner switches it ------------------------------------------

create or replace function set_estimate_permission(staff_id uuid, allowed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can change staff permissions.';
  end if;

  update public.shop_members
  set can_revise_estimate = allowed
  where technician_id = staff_id
    and shop_id = public.my_shop_id()
    and role = 'apprentice';

  if not found then
    raise exception 'That person is not staff in your shop.';
  end if;
end;
$$;

revoke all on function set_estimate_permission(uuid, boolean) from public, anon;
grant execute on function set_estimate_permission(uuid, boolean) to authenticated;

-- 3. Apprentice limits ----------------------------------------------
--
-- Same as 010, except the revised estimate is allowed for staff the
-- owner has permitted (still only on jobs they handle: RLS sees to that).

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
    if new.revised_estimate is not null and not public.i_can_revise_estimate() then
      raise exception 'Only the shop owner, or staff they allow, can set a revised estimate.';
    end if;
    return new;
  end if;

  allowed := new;
  allowed.status := old.status;
  allowed.notes := old.notes;
  allowed.parts_replaced := old.parts_replaced;
  allowed.promised_date := old.promised_date;
  allowed.updated_at := old.updated_at;
  allowed.tracking_code := old.tracking_code;
  allowed.amount_paid := old.amount_paid;
  allowed.payment_method := old.payment_method;
  allowed.payment_ref := old.payment_ref;
  allowed.paid_at := old.paid_at;
  allowed.cancel_requested_at := old.cancel_requested_at;
  allowed.cancel_reason := old.cancel_reason;
  allowed.estimate_status := old.estimate_status;
  allowed.estimate_answered_at := old.estimate_answered_at;
  if public.i_can_revise_estimate() then
    allowed.revised_estimate := old.revised_estimate;
  end if;

  if allowed is distinct from old then
    if new.revised_estimate is distinct from old.revised_estimate then
      raise exception 'Only the shop owner, or staff they allow, can change the revised estimate.';
    end if;
    raise exception 'Staff can only change the status, notes, parts replaced, promised date and payment.';
  end if;
  return new;
end;
$$;

commit;
