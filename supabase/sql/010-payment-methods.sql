-- 010 — cash, e-wallet or card, with a reference (ticket 20)
--
--   1. payment methods become cash / ewallet / card ("other" stays
--      allowed for older records; earlier GCash payments become ewallet)
--   2. payment_ref: the last 4 digits of the reference number, required
--      for e-wallet and card, never for cash
--   3. apprentices may record the reference too
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 008 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Methods --------------------------------------------------------

-- Drop the old method rule, whatever Postgres named it.
do $$
declare
  rule record;
begin
  for rule in
    select conname from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%payment_method%gcash%'
  loop
    execute format('alter table public.jobs drop constraint %I', rule.conname);
  end loop;
end;
$$;

-- Moving old records must not count as an edit: keep updated_at, and
-- don't ping open tracking pages.
alter table jobs disable trigger jobs_set_updated_at;
alter table jobs disable trigger jobs_notify_tracking_page;
update jobs set payment_method = 'ewallet' where payment_method = 'gcash';
alter table jobs enable trigger jobs_set_updated_at;
alter table jobs enable trigger jobs_notify_tracking_page;

alter table jobs add constraint jobs_payment_method_check
  check (payment_method in ('cash', 'ewallet', 'card', 'other'));

-- 2. The reference --------------------------------------------------

alter table jobs add column if not exists payment_ref text;

-- Exactly 4 digits, and only on e-wallet or card payments.
alter table jobs drop constraint if exists jobs_payment_ref_check;
alter table jobs add constraint jobs_payment_ref_check
  check (payment_ref is null or (payment_ref ~ '^[0-9]{4}$' and payment_method in ('ewallet', 'card')));

-- E-wallet and card payments must have one. "not valid" means older
-- records (GCash payments from before this ticket) are left alone, but
-- every new or changed payment is checked.
alter table jobs drop constraint if exists jobs_payment_ref_required;
alter table jobs add constraint jobs_payment_ref_required
  check (payment_method is null or payment_method not in ('ewallet', 'card') or payment_ref is not null)
  not valid;

-- 3. Apprentices may record the reference ---------------------------
--
-- Same as 008, plus payment_ref.

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
  allowed.payment_ref := old.payment_ref;
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

commit;
