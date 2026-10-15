-- 021 — the customer says why they decline a revised estimate (ticket 41)
--
--   1. jobs.estimate_decline_reason: the customer's reason ('' if none)
--   2. guard_job_customer_fields (from 008): the reason is the
--      customer's, so shop accounts can't write it; it is cleared when
--      the estimate changes, like the answer itself
--   3. answer_estimate(code, approve, reason): a declining customer must
--      give a reason; approving clears it
--   4. limit_apprentice_changes (from 012): leaves the reason to the guard
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 020 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. The reason ------------------------------------------------------------

alter table jobs add column if not exists estimate_decline_reason text not null default ''
  check (char_length(estimate_decline_reason) <= 300);

-- 2. The guard: as in 008, plus the decline reason ---------------------------

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
    new.estimate_decline_reason := '';
    new.cancel_requested_at := null;
    new.cancel_reason := '';
    new.paid_at := case when new.amount_paid is null then null else now() end;
    return new;
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

-- 3. The customer's answer, with a reason when declining ---------------------

drop function if exists answer_estimate(text, boolean);

create or replace function answer_estimate(code text, approve boolean, reason text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer text;
  why text := left(trim(coalesce(reason, '')), 300);
begin
  if not approve and why = '' then
    raise exception 'Please tell the shop why you are declining.';
  end if;

  perform set_config('zenith.customer_action', 'on', true);

  update public.jobs
  set estimate_status = case when approve then 'approved' else 'declined' end,
      estimate_answered_at = now(),
      estimate_decline_reason = case when approve then '' else why end
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

revoke all on function answer_estimate(text, boolean, text) from public;
grant execute on function answer_estimate(text, boolean, text) to anon, authenticated;

-- 4. Staff limits: as in 012, plus the decline reason ------------------------
--
-- The guard above runs first (triggers run in name order) and clears the
-- reason when a permitted staff member changes the revised estimate.
-- Without this line, that would look like staff changing a field they
-- may not, and the save would be refused.

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
