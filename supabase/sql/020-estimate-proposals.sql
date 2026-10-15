-- 020 — staff propose a revised estimate on a repair (ticket 39)
--
-- Staff who may not set revised estimates themselves can propose one on
-- a repair they handle: the new amount and why. The owner approves it
-- (the amount becomes the repair's revised estimate, and the customer is
-- asked to accept it, exactly as when the owner types it in: the trigger
-- from 008 sets estimate_status to 'pending') or rejects it, with an
-- optional note.
--
--   1. estimate_proposals (RLS: staff read their own, the owner their
--      shop's; no write policies, only the two functions below)
--   2. propose_revised_estimate(job_id, amount, reason): staff
--   3. decide_revised_estimate(proposal_id, approve, note): owner
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 019 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. Proposals -----------------------------------------------------------

create table if not exists estimate_proposals (
  id          uuid          primary key default gen_random_uuid(),
  shop_id     uuid          not null references shops (id) on delete cascade,
  job_id      uuid          not null references jobs (id) on delete cascade,
  staff_id    uuid          not null references technicians (id) on delete cascade,
  amount      numeric(10,2) not null check (amount >= 0),
  reason      text          not null check (char_length(trim(reason)) between 10 and 500),
  status      text          not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  owner_note  text          not null default '' check (char_length(owner_note) <= 300),
  created_at  timestamptz   not null default now(),
  decided_at  timestamptz
);

-- One waiting proposal per repair at a time.
create unique index if not exists estimate_proposals_one_pending
  on estimate_proposals (job_id) where status = 'pending';
create index if not exists estimate_proposals_shop_id_idx on estimate_proposals (shop_id);

alter table estimate_proposals enable row level security;

drop policy if exists "Staff read their own estimate proposals" on estimate_proposals;
create policy "Staff read their own estimate proposals"
  on estimate_proposals for select
  to authenticated
  using (staff_id = (select auth.uid()));

drop policy if exists "The owner reads their shop's estimate proposals" on estimate_proposals;
create policy "The owner reads their shop's estimate proposals"
  on estimate_proposals for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

-- 2. Staff propose ---------------------------------------------------------
--
-- Only current staff, only on an open repair they handle in their shop,
-- only if they can't set it themselves, one waiting proposal per repair.

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
  if shop is null or public.i_own_my_shop() then
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
    raise exception 'Enter an amount of ₱0 or more.';
  end if;
  if char_length(trim(coalesce(reason, ''))) not between 10 and 500 then
    raise exception 'Give a reason of 10 to 500 characters.';
  end if;
  if exists (
    select 1 from public.estimate_proposals p
    where p.job_id = propose_revised_estimate.job_id and p.status = 'pending'
  ) then
    raise exception 'This repair already has a proposal waiting for the owner.';
  end if;

  insert into public.estimate_proposals (shop_id, job_id, staff_id, amount, reason)
  values (shop, job.id, auth.uid(), round(amount, 2), trim(reason));
end;
$$;

revoke all on function propose_revised_estimate(uuid, numeric, text) from public, anon;
grant execute on function propose_revised_estimate(uuid, numeric, text) to authenticated;

-- 3. The owner decides -----------------------------------------------------

create or replace function decide_revised_estimate(proposal_id uuid, approve boolean, note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.estimate_proposals;
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can answer proposals.';
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

  -- As if the owner typed it in: the 008 trigger asks the customer again.
  if approve then
    update public.jobs set revised_estimate = p.amount where id = p.job_id;
  end if;
end;
$$;

revoke all on function decide_revised_estimate(uuid, boolean, text) from public, anon;
grant execute on function decide_revised_estimate(uuid, boolean, text) to authenticated;

commit;
