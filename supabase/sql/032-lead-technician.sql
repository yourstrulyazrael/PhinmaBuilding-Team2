-- 032 — a third role: Lead Technician (ticket 83)
--
-- Three roles now, from most to least authority:
--   owner       the admin: everything
--   lead        Lead Technician: works on ANY repair in the shop, sets
--               revised quotes, approves staff's proposals and requests,
--               reassigns repairs, and adds Staff (never another Lead)
--   apprentice  Staff: the repairs they handle
--
-- Still the owner's alone: adding a Lead, promoting or demoting someone,
-- editing anyone's details, resetting passwords, removing people,
-- reports and earnings, store settings, the inventory catalog.
--
--   1. 'lead' is allowed in shop_members.role
--   2. i_lead_my_shop(): owner OR lead (the new "manager" check)
--   3. repairs: leads may change any repair (jobs, parts, photos)
--   4. revised quotes: leads set them, read and answer proposals and
--      requests, and can take the permission back
--   5. reassigning repairs: owner or lead
--   6. adding people: leads add Staff; only the owner adds a Lead
--   7. the owner manages leads like staff (edit, reset, remove), and can
--      promote / demote with set_member_role
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 031 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. The role ----------------------------------------------------------------

alter table shop_members drop constraint if exists shop_members_role_check;
alter table shop_members add constraint shop_members_role_check
  check (role in ('owner', 'lead', 'apprentice'));

-- 2. "Am I the owner or a lead?" ------------------------------------------------

create or replace function i_lead_my_shop()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid() and role in ('owner', 'lead') and removed_at is null
  );
$$;

revoke all on function i_lead_my_shop() from public, anon;
grant execute on function i_lead_my_shop() to authenticated;

-- 3. Repairs: owner and leads change any repair; staff the ones they handle ---

drop policy if exists "Members can update jobs they may change" on jobs;
create policy "Members can update jobs they may change"
  on jobs for update
  to authenticated
  using (
    shop_id = (select my_shop_id())
    and ((select i_lead_my_shop()) or handled_by = (select auth.uid()))
  )
  with check (shop_id = (select my_shop_id()));

-- Parts used on a repair follow the same rule (from 013).
create or replace function i_can_change_job(job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = job
      and j.shop_id = public.my_shop_id()
      and (public.i_lead_my_shop() or j.handled_by = auth.uid())
  );
$$;

-- Photos too (from 030).
create or replace function can_change_job_photos(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.shop_id::text = (storage.foldername(object_name))[1]
      and j.id::text = (storage.foldername(object_name))[2]
      and j.shop_id = public.my_shop_id()
      and j.status <> 'cancelled'
      and (public.i_lead_my_shop() or j.handled_by = auth.uid())
  );
$$;

-- Staff are limited to some columns (from 023). Leads, like the owner,
-- may change all of them (e.g. correct the device or customer details).
create or replace function limit_apprentice_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed public.jobs;
begin
  if auth.uid() is null or public.i_lead_my_shop() then
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
  allowed.estimate_decline_reason := old.estimate_decline_reason;
  allowed.parts_total := old.parts_total;
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

-- 4. Revised quotes ---------------------------------------------------------------

-- Owner and leads always may; staff if allowed (from 019).
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
      and (role in ('owner', 'lead') or can_revise_estimate)
  );
$$;

-- Staff's requests for the permission: owner and leads read and answer.
drop policy if exists "The owner reads their shop's estimate requests" on estimate_requests;
drop policy if exists "Owner and leads read the shop's estimate requests" on estimate_requests;
create policy "Owner and leads read the shop's estimate requests"
  on estimate_requests for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_lead_my_shop()));

create or replace function decide_estimate_request(request_id uuid, approve boolean, note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.estimate_requests;
begin
  if not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can answer requests.';
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

-- Taking the permission back: owner and leads, staff only.
create or replace function set_estimate_permission(staff_id uuid, allowed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can change staff permissions.';
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

-- Staff's proposals on a repair: owner and leads read and answer.
drop policy if exists "The owner reads their shop's estimate proposals" on estimate_proposals;
drop policy if exists "Owner and leads read the shop's estimate proposals" on estimate_proposals;
create policy "Owner and leads read the shop's estimate proposals"
  on estimate_proposals for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_lead_my_shop()));

-- Only staff propose (leads set the quote themselves). As in 020 otherwise.
create or replace function propose_revised_estimate(job_id uuid, amount numeric, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
  job public.jobs;
begin
  if shop is null or public.i_lead_my_shop() then
    raise exception 'Only staff propose revised estimates.';
  end if;
  if public.i_can_revise_estimate() then
    raise exception 'You can set the revised estimate yourself.';
  end if;

  select * into job from public.jobs j where j.id = propose_revised_estimate.job_id and j.shop_id = shop;
  if job.id is null then
    raise exception 'That repair is not in your shop.';
  end if;
  if job.handled_by <> auth.uid() then
    raise exception 'You can only propose on repairs you handle.';
  end if;
  if job.status in ('picked_up', 'cancelled') then
    raise exception 'That repair is finished.';
  end if;
  if amount is null or amount < 0 or amount > 99999999.99 then
    raise exception 'Enter an amount of 0 or more.';
  end if;
  if char_length(trim(coalesce(reason, ''))) not between 10 and 500 then
    raise exception 'Give a reason of 10 to 500 characters.';
  end if;
  if exists (
    select 1 from public.estimate_proposals p
    where p.job_id = propose_revised_estimate.job_id and p.status = 'pending'
  ) then
    raise exception 'This repair already has a proposal waiting.';
  end if;

  insert into public.estimate_proposals (shop_id, job_id, staff_id, amount, reason)
  values (shop, job.id, auth.uid(), round(amount, 2), trim(reason));
end;
$$;

create or replace function decide_revised_estimate(proposal_id uuid, approve boolean, note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.estimate_proposals;
begin
  if not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can answer proposals.';
  end if;

  select * into p from public.estimate_proposals
  where id = proposal_id and shop_id = public.my_shop_id()
  for update;
  if p.id is null then
    raise exception 'That proposal is not in your shop.';
  end if;
  if p.status <> 'pending' then
    raise exception 'That proposal has already been answered.';
  end if;
  if approve and exists (
    select 1 from public.jobs where id = p.job_id and status in ('picked_up', 'cancelled')
  ) then
    raise exception 'That repair is finished, so its estimate can no longer change. Reject the proposal instead.';
  end if;

  update public.estimate_proposals
  set status = case when approve then 'approved' else 'rejected' end,
      owner_note = left(trim(coalesce(note, '')), 300),
      decided_at = now()
  where id = proposal_id;

  -- As if they typed it in: the 008 trigger asks the customer again.
  if approve then
    update public.jobs set revised_estimate = p.amount where id = p.job_id;
  end if;
end;
$$;

-- 5. Reassigning repairs: owner and leads (from 027) ------------------------------

create or replace function reassign_job(job_id uuid, staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
begin
  if not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can reassign repairs.';
  end if;
  if not exists (
    select 1 from public.shop_members m
    where m.technician_id = reassign_job.staff_id and m.shop_id = shop and m.removed_at is null
  ) then
    raise exception 'That person is not in your shop.';
  end if;

  update public.jobs j
  set handled_by = reassign_job.staff_id
  where j.id = reassign_job.job_id and j.shop_id = shop;
  if not found then
    raise exception 'That repair is not in your shop.';
  end if;
end;
$$;

-- 6. Adding people -------------------------------------------------------------------

-- The one-time sign-up ticket (from 017): owner or lead.
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
  if shop is null or not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can add staff.';
  end if;
  insert into public.staff_tickets (shop_id) values (shop) returning token into ticket;
  return ticket;
end;
$$;

-- add_staff now says which role. The old one-argument version goes, so
-- calls can't be ambiguous.
drop function if exists add_staff(uuid);

create or replace function add_staff(staff_id uuid, staff_role text default 'apprentice')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
begin
  if staff_role not in ('apprentice', 'lead') then
    raise exception 'Choose Staff or Lead technician.';
  end if;
  if shop is null or not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can add staff.';
  end if;
  -- Only the owner (the admin) adds a lead.
  if staff_role = 'lead' and not public.i_own_my_shop() then
    raise exception 'Only the shop owner can add a lead technician.';
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
  values (staff_id, shop, staff_role);
end;
$$;

revoke all on function add_staff(uuid, text) from public, anon;
grant execute on function add_staff(uuid, text) to authenticated;

-- The team list with emails and last sign-in (from 019): owner and leads.
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
  if not public.i_lead_my_shop() then
    raise exception 'Only the shop owner or a lead technician can see staff accounts.';
  end if;

  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at
    from public.shop_members m
    join auth.users u on u.id = m.technician_id
    where m.shop_id = public.my_shop_id() and m.removed_at is null;
end;
$$;

-- 7. The owner manages leads as well as staff ---------------------------------------

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
      and role in ('apprentice', 'lead') and removed_at is null
  ) then
    raise exception 'That person is not staff in your shop.';
  end if;

  update public.technicians
  set display_name = trim(update_staff_details.display_name),
      contact_number = trim(update_staff_details.contact_number)
  where id = staff_id;
end;
$$;

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
      and role in ('apprentice', 'lead')
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

  delete from auth.sessions where user_id = staff_id;
end;
$$;

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
    and role in ('apprentice', 'lead') and removed_at is null;
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

-- Promote a staff member to lead, or back (owner only). A waiting request
-- for quote permission is settled: a lead can revise quotes anyway.
create or replace function set_member_role(staff_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can change roles.';
  end if;
  if new_role not in ('apprentice', 'lead') then
    raise exception 'Choose Staff or Lead technician.';
  end if;

  update public.shop_members
  set role = new_role, can_revise_estimate = false
  where technician_id = staff_id and shop_id = shop
    and role in ('apprentice', 'lead') and removed_at is null;
  if not found then
    raise exception 'That person is not staff in your shop.';
  end if;

  if new_role = 'lead' then
    update public.estimate_requests
    set status = 'approved', owner_note = 'Made a lead technician.', decided_at = now()
    where estimate_requests.staff_id = set_member_role.staff_id and status = 'pending';
  end if;
end;
$$;

revoke all on function set_member_role(uuid, text) from public, anon;
grant execute on function set_member_role(uuid, text) to authenticated;

commit;
