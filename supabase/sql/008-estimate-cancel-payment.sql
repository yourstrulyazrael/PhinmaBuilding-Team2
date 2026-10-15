-- 008 — estimate approval, cancellation, payment (tickets 17–19)
--
--   1. "Cancelled" becomes a 7th status
--   2. new job columns: the customer's estimate answer, a cancellation
--      request, and the payment record
--   3. a guard trigger: only customers can answer an estimate or request
--      a cancellation; the shop can only clear a request
--   4. apprentices may also record payment and clear a request
--   5. answer_estimate and request_cancellation, for the tracking page
--   6. the tracking page gets the new fields
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 007 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Cancelled ------------------------------------------------------

-- Drop the old six-status rule, whatever Postgres named it.
do $$
declare
  rule record;
begin
  for rule in
    select conname from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%received%'
  loop
    execute format('alter table public.jobs drop constraint %I', rule.conname);
  end loop;
end;
$$;

alter table jobs add constraint jobs_status_check check (status in (
  'received', 'diagnosing', 'waiting_for_parts', 'repairing',
  'ready_for_pickup', 'picked_up', 'cancelled'
));

-- 2. New columns ----------------------------------------------------
--
-- estimate_status: null = nothing to answer (no revised estimate, or
-- one agreed before this ticket); 'pending' = waiting for the customer.

alter table jobs add column if not exists estimate_status text
  check (estimate_status in ('pending', 'approved', 'declined'));
alter table jobs add column if not exists estimate_answered_at timestamptz;

alter table jobs add column if not exists cancel_requested_at timestamptz;
alter table jobs add column if not exists cancel_reason text not null default ''
  check (char_length(cancel_reason) <= 300);

alter table jobs add column if not exists amount_paid numeric(10,2) check (amount_paid >= 0);
alter table jobs add column if not exists payment_method text
  check (payment_method in ('cash', 'gcash', 'other'));
alter table jobs add column if not exists paid_at timestamptz;

-- 3. The guard ------------------------------------------------------
--
-- Customer actions run through the two functions in section 5, which
-- set a private flag for the length of their own transaction. Without
-- that flag (i.e. any shop account, however the request is made):
--   * the estimate answer cannot be set or changed
--   * a cancellation request cannot be created, only cleared
-- It also keeps the bookkeeping right:
--   * a new or changed revised estimate goes back to "waiting"
--   * finishing a job (Picked up or Cancelled) clears any request
--   * paid_at is stamped by the database when the amount is recorded

create or replace function guard_job_customer_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  by_customer boolean := coalesce(current_setting('zenith.customer_action', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.estimate_status := case when new.revised_estimate is null then null else 'pending' end;
    new.estimate_answered_at := null;
    new.cancel_requested_at := null;
    new.cancel_reason := '';
    new.paid_at := case when new.amount_paid is null then null else now() end;
    return new;
  end if;

  if not by_customer then
    new.estimate_status := old.estimate_status;
    new.estimate_answered_at := old.estimate_answered_at;
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

drop trigger if exists jobs_guard_customer_fields on jobs;
create trigger jobs_guard_customer_fields
  before insert or update on jobs
  for each row execute function guard_job_customer_fields();

-- 4. Apprentices: also payment, and clearing a request ----------------
--
-- Same as 007, plus the payment record and the cancellation request
-- (the guard above already stops anyone creating a request). The
-- estimate answer is listed so a customer answering an apprentice's job
-- is not blocked; the guard stops shop accounts setting it.

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

  allowed := new;
  allowed.status := old.status;
  allowed.notes := old.notes;
  allowed.parts_replaced := old.parts_replaced;
  allowed.promised_date := old.promised_date;
  allowed.updated_at := old.updated_at;
  allowed.tracking_code := old.tracking_code;
  allowed.amount_paid := old.amount_paid;
  allowed.payment_method := old.payment_method;
  allowed.paid_at := old.paid_at;
  allowed.cancel_requested_at := old.cancel_requested_at;
  allowed.cancel_reason := old.cancel_reason;
  allowed.estimate_status := old.estimate_status;
  allowed.estimate_answered_at := old.estimate_answered_at;

  if allowed is distinct from old then
    raise exception 'Apprentices can only change the status, notes, parts replaced, promised date and payment.';
  end if;
  return new;
end;
$$;

-- 5. Customer actions from the tracking page --------------------------
--
-- Anyone with the tracking code may call these, like get_tracking_page.
-- Each does one thing, to one job, only while it is not finished.

create or replace function answer_estimate(code text, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer text;
begin
  perform set_config('zenith.customer_action', 'on', true);

  update public.jobs
  set estimate_status = case when approve then 'approved' else 'declined' end,
      estimate_answered_at = now()
  where tracking_code = code
    and estimate_status = 'pending'
    and status not in ('picked_up', 'cancelled')
  returning estimate_status into answer;

  perform set_config('zenith.customer_action', 'off', true);

  if answer is null then
    raise exception 'There is no estimate waiting for your answer.';
  end if;
  return answer;
end;
$$;

create or replace function request_cancellation(code text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('zenith.customer_action', 'on', true);

  update public.jobs
  set cancel_requested_at = now(),
      cancel_reason = left(trim(coalesce(reason, '')), 300)
  where tracking_code = code
    and cancel_requested_at is null
    and status not in ('picked_up', 'cancelled');

  perform set_config('zenith.customer_action', 'off', true);

  if not found then
    raise exception 'This repair is finished, or a cancellation was already requested.';
  end if;
end;
$$;

revoke all on function guard_job_customer_fields() from public, anon, authenticated;
revoke all on function answer_estimate(text, boolean) from public;
revoke all on function request_cancellation(text, text) from public;
grant execute on function answer_estimate(text, boolean) to anon, authenticated;
grant execute on function request_cancellation(text, text) to anon, authenticated;

-- 6. Tracking page: the new fields -----------------------------------
--
-- Adds the estimate answer and whether a cancellation was requested.
-- Still never the customer's name or phone, and never the payment.

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
  promised_date        date,
  updated_at           timestamptz,
  cancel_requested     boolean,
  shop_name            text,
  shop_contact         text,
  technician_name      text
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
    j.promised_date,
    j.updated_at,
    j.cancel_requested_at is not null,
    s.name,
    owner.contact_number,
    handler.display_name
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
