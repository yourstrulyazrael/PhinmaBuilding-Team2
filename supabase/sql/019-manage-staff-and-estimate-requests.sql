-- 019 — the owner edits and removes staff; staff ASK to revise
--       estimates (ticket 37)
--
--   1. shop_members.removed_at: a removed person keeps their name on
--      past repairs but loses all access. Their login is NOT deleted:
--      that would need the service_role key, and the database refuses
--      to delete anyone who has handled or quoted a repair.
--   2. my_shop_id and the permission checks ignore removed people, so
--      every RLS rule (they all ask my_shop_id) shuts them out at once
--   3. update_staff_details: the owner fixes a staff member's name and
--      number
--   4. remove_staff: their open repairs move to the owner; their
--      permission and any pending request end
--   5. estimate_requests: staff ask with a reason; the owner approves
--      (which grants the permission) or rejects, with an optional note.
--      set_estimate_permission stays, now only used to take it back.
--   6. i_was_removed, so the app can tell a removed person what happened
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 018 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. Removed members ---------------------------------------------------

alter table shop_members add column if not exists removed_at timestamptz;

-- 2. Removed people are in no shop, own nothing, may revise nothing ------

create or replace function my_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select shop_id from public.shop_members
  where technician_id = auth.uid() and removed_at is null;
$$;

create or replace function i_own_my_shop()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid() and role = 'owner' and removed_at is null
  );
$$;

create or replace function i_can_revise_estimate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid()
      and removed_at is null
      and (role = 'owner' or can_revise_estimate)
  );
$$;

-- Only current staff can have their permission taken back.
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
    and role = 'apprentice'
    and removed_at is null;

  if not found then
    raise exception 'That person is not staff in your shop.';
  end if;
end;
$$;

-- The owner's Staff tab lists current members only.
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
    where m.shop_id = public.my_shop_id() and m.removed_at is null;
end;
$$;

-- 3. Edit a staff member's name and number (owner only) -----------------
--
-- technicians has no policy letting anyone change another person's row,
-- so this function is the only way, and it checks the person is current
-- staff in the owner's own shop. The table's own checks (1–80 and 1–40
-- characters) still apply.

create or replace function update_staff_details(staff_id uuid, display_name text, contact_number text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can edit staff.';
  end if;
  if not exists (
    select 1 from public.shop_members
    where technician_id = staff_id and shop_id = public.my_shop_id()
      and role = 'apprentice' and removed_at is null
  ) then
    raise exception 'That person is not staff in your shop.';
  end if;

  update public.technicians
  set display_name = trim(update_staff_details.display_name),
      contact_number = trim(update_staff_details.contact_number)
  where id = staff_id;
end;
$$;

revoke all on function update_staff_details(uuid, text, text) from public, anon;
grant execute on function update_staff_details(uuid, text, text) to authenticated;

-- 4. Remove a staff member (owner only) --------------------------------
--
-- Returns how many open repairs moved to the owner.

create or replace function remove_staff(staff_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
  moved integer;
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can remove staff.';
  end if;

  update public.shop_members
  set removed_at = now(), can_revise_estimate = false
  where technician_id = staff_id and shop_id = shop
    and role = 'apprentice' and removed_at is null;
  if not found then
    raise exception 'That person is not staff in your shop.';
  end if;

  update public.jobs
  set handled_by = auth.uid()
  where shop_id = shop and handled_by = staff_id
    and status not in ('picked_up', 'cancelled');
  get diagnostics moved = row_count;

  update public.estimate_requests
  set status = 'rejected', owner_note = 'Removed from the shop.', decided_at = now()
  where staff_id = remove_staff.staff_id and status = 'pending';

  return moved;
end;
$$;

-- 5. Estimate requests ---------------------------------------------------

create table if not exists estimate_requests (
  id          uuid        primary key default gen_random_uuid(),
  shop_id     uuid        not null references shops (id) on delete cascade,
  staff_id    uuid        not null references technicians (id) on delete cascade,
  reason      text        not null check (char_length(trim(reason)) between 10 and 500),
  status      text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  owner_note  text        not null default '' check (char_length(owner_note) <= 300),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

-- One open request per person at a time.
create unique index if not exists estimate_requests_one_pending
  on estimate_requests (staff_id) where status = 'pending';
create index if not exists estimate_requests_shop_id_idx on estimate_requests (shop_id);

-- RLS: staff read their own requests; the owner reads their shop's.
-- No insert, update or delete policies: only the functions below write.
alter table estimate_requests enable row level security;

drop policy if exists "Staff read their own estimate requests" on estimate_requests;
create policy "Staff read their own estimate requests"
  on estimate_requests for select
  to authenticated
  using (staff_id = (select auth.uid()));

drop policy if exists "The owner reads their shop's estimate requests" on estimate_requests;
create policy "The owner reads their shop's estimate requests"
  on estimate_requests for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

-- Staff ask. Only current staff without the permission, one at a time.
create or replace function request_estimate_permission(reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.shop_members;
begin
  select * into me from public.shop_members
  where technician_id = auth.uid() and removed_at is null;

  if me.technician_id is null or me.role <> 'apprentice' then
    raise exception 'Only staff can ask for this.';
  end if;
  if me.can_revise_estimate then
    raise exception 'You can already revise estimates.';
  end if;
  if char_length(trim(coalesce(reason, ''))) not between 10 and 500 then
    raise exception 'Give a reason of 10 to 500 characters.';
  end if;
  if exists (select 1 from public.estimate_requests where staff_id = auth.uid() and status = 'pending') then
    raise exception 'You already have a request waiting for the owner.';
  end if;

  insert into public.estimate_requests (shop_id, staff_id, reason)
  values (me.shop_id, auth.uid(), trim(reason));
end;
$$;

revoke all on function request_estimate_permission(text) from public, anon;
grant execute on function request_estimate_permission(text) to authenticated;

-- The owner answers. Approving grants the permission.
create or replace function decide_estimate_request(request_id uuid, approve boolean, note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.estimate_requests;
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can answer requests.';
  end if;

  select * into req from public.estimate_requests
  where id = request_id and shop_id = public.my_shop_id()
  for update;
  if req.id is null then
    raise exception 'That request is not in your shop.';
  end if;
  if req.status <> 'pending' then
    raise exception 'That request has already been answered.';
  end if;

  update public.estimate_requests
  set status = case when approve then 'approved' else 'rejected' end,
      owner_note = left(trim(coalesce(note, '')), 300),
      decided_at = now()
  where id = request_id;

  if approve then
    update public.shop_members
    set can_revise_estimate = true
    where technician_id = req.staff_id and shop_id = req.shop_id and removed_at is null;
  end if;
end;
$$;

revoke all on function decide_estimate_request(uuid, boolean, text) from public, anon;
grant execute on function decide_estimate_request(uuid, boolean, text) to authenticated;

-- remove_staff refers to estimate_requests, so its grants come after.
revoke all on function remove_staff(uuid) from public, anon;
grant execute on function remove_staff(uuid) to authenticated;

-- 6. "Was I removed?" ------------------------------------------------------

create or replace function i_was_removed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid() and removed_at is not null
  );
$$;

revoke all on function i_was_removed() from public, anon;
grant execute on function i_was_removed() to authenticated;

commit;
