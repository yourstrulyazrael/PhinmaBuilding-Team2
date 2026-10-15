-- 023 — parts are charged on top of the labour quote (ticket 47)
--
-- The initial quote and any revised estimate are now LABOUR. Parts used
-- on a repair are added on top, at the retail price recorded when each
-- part was used (014). What the customer pays = labour + parts.
--
--   1. jobs.parts_total: the sum of the repair's parts, kept up to date by
--      the database (filled in now for existing repairs)
--   2. a trigger on job_parts recalculates it whenever a part is added,
--      changed or removed. Only that trigger may write it.
--   3. guard_job_customer_fields (from 021): shop accounts can't write
--      parts_total directly
--   4. limit_apprentice_changes (from 021): staff adding a part to their
--      repair updates parts_total, which is allowed
--   5. get_tracking_page (from 016): also returns each part with its
--      price and the parts total, so the customer sees an itemised price
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 022 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. The parts total -------------------------------------------------------

alter table jobs add column if not exists parts_total numeric(10,2) not null default 0
  check (parts_total >= 0);

-- 2. Kept up to date ---------------------------------------------------------
--
-- Security definer so it can update the repair whoever added the part
-- (RLS on job_parts already decided they may). It raises a private flag
-- for the guard below, for this one update only.

create or replace function recalc_job_parts_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.job_id, old.job_id);
begin
  perform set_config('zenith.parts_total', 'on', true);
  update public.jobs
  set parts_total = (
    select coalesce(sum(jp.unit_price * jp.quantity), 0)
    from public.job_parts jp
    where jp.job_id = target
  )
  where id = target;
  perform set_config('zenith.parts_total', 'off', true);
  -- A part moved to another repair: fix the old one too.
  if tg_op = 'UPDATE' and old.job_id is distinct from new.job_id then
    perform set_config('zenith.parts_total', 'on', true);
    update public.jobs
    set parts_total = (
      select coalesce(sum(jp.unit_price * jp.quantity), 0)
      from public.job_parts jp
      where jp.job_id = old.job_id
    )
    where id = old.job_id;
    perform set_config('zenith.parts_total', 'off', true);
  end if;
  return null;
end;
$$;

revoke all on function recalc_job_parts_total() from public, anon, authenticated;

drop trigger if exists job_parts_recalc_total on job_parts;
create trigger job_parts_recalc_total
  after insert or update or delete on job_parts
  for each row execute function recalc_job_parts_total();

-- (The existing repairs are filled in at the end, once the guard below
-- knows about parts_total.)

-- 3. The guard: as in 021, plus parts_total ----------------------------------

create or replace function guard_job_customer_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  by_customer boolean := coalesce(current_setting('zenith.customer_action', true), '') = 'on';
  by_parts boolean := coalesce(current_setting('zenith.parts_total', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.estimate_status := case when new.revised_estimate is null then null else 'pending' end;
    new.estimate_answered_at := null;
    new.estimate_decline_reason := '';
    new.cancel_requested_at := null;
    new.cancel_reason := '';
    new.paid_at := case when new.amount_paid is null then null else now() end;
    new.parts_total := 0;
    return new;
  end if;

  -- Only the parts trigger above may change the parts total.
  if not by_parts then
    new.parts_total := old.parts_total;
  end if;

  if not by_customer then
    new.estimate_status := old.estimate_status;
    new.estimate_answered_at := old.estimate_answered_at;
    new.estimate_decline_reason := old.estimate_decline_reason;
    if new.cancel_requested_at is not null then
      -- Can't create or change a request; can clear one.
      new.cancel_requested_at := old.cancel_requested_at;
      new.cancel_reason := old.cancel_reason;
    else
      new.cancel_reason := '';
    end if;
  end if;

  if new.revised_estimate is distinct from old.revised_estimate then
    new.estimate_status := case when new.revised_estimate is null then null else 'pending' end;
    new.estimate_answered_at := null;
    new.estimate_decline_reason := '';
  end if;

  if new.status in ('picked_up', 'cancelled') then
    new.cancel_requested_at := null;
    new.cancel_reason := '';
  end if;

  if new.amount_paid is distinct from old.amount_paid then
    new.paid_at := case when new.amount_paid is null then null else now() end;
  else
    new.paid_at := old.paid_at;
  end if;

  return new;
end;
$$;

revoke all on function guard_job_customer_fields() from public, anon, authenticated;

-- 4. Staff limits: as in 021, plus parts_total -------------------------------

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

-- 5. The tracking page: as in 016, plus the itemised parts --------------------

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
  parts_lines          jsonb
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
    ), '[]'::jsonb)
  from public.jobs j
  join public.shops s on s.id = j.shop_id
  join public.technicians owner on owner.id = s.owner_id
  join public.technicians handler on handler.id = j.handled_by
  where j.tracking_code = code
  limit 1;
$$;

revoke all on function get_tracking_page(text) from public;
grant execute on function get_tracking_page(text) to anon, authenticated;

-- 6. Fill in existing repairs -------------------------------------------------
--
-- Only repairs that have parts. The "last updated" stamp is left alone
-- (its trigger is paused for this one update), because reminders like
-- "Ready for 3 days" count from it. The flag lets the guard accept it.

alter table jobs disable trigger jobs_set_updated_at;
select set_config('zenith.parts_total', 'on', true);
update jobs j
set parts_total = t.total
from (
  select job_id, sum(unit_price * quantity) as total from job_parts group by job_id
) t
where t.job_id = j.id and j.parts_total is distinct from t.total;
select set_config('zenith.parts_total', 'off', true);
alter table jobs enable trigger jobs_set_updated_at;

commit;
