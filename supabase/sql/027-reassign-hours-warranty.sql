-- 027 — reassign repairs, opening hours, warranty (tickets 44, 56, 57)
--
--   1. reassign_job(job_id, staff_id): the owner hands a repair to someone
--      else in the shop: themself or current staff, never a removed person
--      or anyone outside. Cancelled repairs stay closed (024).
--   2. shops.hours: the shop's opening hours, for the "ready for pickup"
--      message (e.g. "Mon–Sat, 9 AM–6 PM"); '' if not set.
--   3. Warranty: shops.warranty_days (30 by default; 0 = no warranty) and
--      a new status, 'warranty' ("Back under warranty"), allowed only for
--      a picked-up repair still inside its warranty (its estimated
--      completion date moves to today if it had passed). The warranty runs
--      from the day it was paid for and picked up.
--   4. get_tracking_page (from 026): also returns the warranty end date
--      and the opening hours.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 026 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. Reassign (owner only) -------------------------------------------------

create or replace function reassign_job(job_id uuid, staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := public.my_shop_id();
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can reassign repairs.';
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

revoke all on function reassign_job(uuid, uuid) from public, anon;
grant execute on function reassign_job(uuid, uuid) to authenticated;

-- 2. Opening hours, 3. warranty period ---------------------------------------

alter table shops add column if not exists hours text not null default ''
  check (char_length(hours) <= 120);
alter table shops add column if not exists warranty_days integer not null default 30
  check (warranty_days between 0 and 365);

-- 3. The "Back under warranty" status -----------------------------------------

alter table jobs drop constraint if exists jobs_status_check;
alter table jobs add constraint jobs_status_check check (status in (
  'received', 'diagnosing', 'waiting_for_parts', 'repairing',
  'ready_for_pickup', 'picked_up', 'cancelled', 'warranty'
));

-- Only a picked-up repair, still inside its warranty, can come back.
create or replace function check_warranty_return()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  days integer;
  picked date;
begin
  if new.status = 'warranty' and old.status is distinct from 'warranty' then
    if old.status <> 'picked_up' then
      raise exception 'Only a repair that was picked up can come back under warranty.';
    end if;
    select s.warranty_days into days from public.shops s where s.id = new.shop_id;
    picked := (coalesce(old.paid_at, old.updated_at) at time zone 'Asia/Manila')::date;
    if coalesce(days, 0) = 0 then
      raise exception 'This shop doesn''t give a warranty. Set one on Account first.';
    end if;
    if picked + days < (now() at time zone 'Asia/Manila')::date then
      raise exception 'This repair''s warranty ended on %.', to_char(picked + days, 'Mon DD, YYYY');
    end if;
    -- Its old completion date has passed: start from today, so it isn't
    -- shown as late straight away. The shop can set a new date.
    if new.promised_date < (now() at time zone 'Asia/Manila')::date then
      new.promised_date := (now() at time zone 'Asia/Manila')::date;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function check_warranty_return() from public, anon, authenticated;

drop trigger if exists jobs_check_warranty_return on jobs;
create trigger jobs_check_warranty_return
  before update on jobs
  for each row execute function check_warranty_return();

-- 4. The tracking page: as in 026, plus warranty_until and shop_hours ---------

drop function if exists get_tracking_page(text);
create function get_tracking_page(code text)
returns table (
  device               text,
  problem              text,
  status               text,
  initial_quote        numeric,
  revised_estimate     numeric,
  estimate_status      text,
  notes                text,
  parts_replaced       text,
  parts_used           text,
  promised_date        date,
  updated_at           timestamptz,
  cancel_requested     boolean,
  shop_name            text,
  shop_contact         text,
  technician_name      text,
  shop_address         text,
  parts_total          numeric,
  parts_lines          jsonb,
  shop_currency        text,
  warranty_until       date,
  shop_hours           text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    j.device,
    j.problem,
    j.status,
    j.initial_quote,
    j.revised_estimate,
    j.estimate_status,
    j.notes,
    j.parts_replaced,
    (
      select string_agg(p.name || case when jp.quantity > 1 then ' ×' || jp.quantity else '' end, ', ' order by jp.created_at)
      from public.job_parts jp
      join public.parts p on p.id = jp.part_id
      where jp.job_id = j.id
    ),
    j.promised_date,
    j.updated_at,
    j.cancel_requested_at is not null,
    s.name,
    coalesce(nullif(trim(s.phone), ''), owner.contact_number),
    handler.display_name,
    s.address,
    j.parts_total,
    -- Name, quantity and price of each part: never the shop's cost.
    coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name, 'quantity', jp.quantity, 'unit_price', jp.unit_price) order by jp.created_at)
      from public.job_parts jp
      join public.parts p on p.id = jp.part_id
      where jp.job_id = j.id
    ), '[]'::jsonb),
    s.currency,
    -- Warranty end date (Manila), once picked up and if the shop gives one.
    case when j.paid_at is not null and s.warranty_days > 0
      then (j.paid_at at time zone 'Asia/Manila')::date + s.warranty_days end,
    s.hours
  from public.jobs j
  join public.shops s on s.id = j.shop_id
  join public.technicians owner on owner.id = s.owner_id
  join public.technicians handler on handler.id = j.handled_by
  where j.tracking_code = code
  limit 1;
$$;

revoke all on function get_tracking_page(text) from public;
grant execute on function get_tracking_page(text) to anon, authenticated;

commit;
