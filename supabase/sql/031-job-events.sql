-- 031 — a history of what happened to each repair (ticket 69)
--
-- Feeds the "Recent activity" list on the Overview: repair checked in,
-- status changed, payment recorded, reassigned, customer answered a
-- revised quote. The database writes it by itself whenever a repair
-- changes, so the app can't forget to, and nobody can edit or fake it.
--
--   1. job_events (read-only for the shop's members)
--   2. a trigger on jobs that adds a row for each change
--   3. back-fill: one "checked in" (and "picked up") row for repairs
--      that already exist, so the list isn't empty on day one
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 030 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. The history ----------------------------------------------------------------

create table if not exists job_events (
  id          bigint      generated always as identity primary key,
  shop_id     uuid        not null references shops (id) on delete cascade,
  job_id      uuid        not null references jobs (id) on delete cascade,
  -- Who did it; empty when it was the customer (from their tracking page).
  actor       uuid        references auth.users (id) on delete set null,
  kind        text        not null check (kind in ('created', 'status', 'payment', 'reassigned', 'estimate_answer')),
  -- The new status ('status'), the new technician's id ('reassigned'),
  -- or 'approved' / 'declined' ('estimate_answer').
  detail      text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists job_events_shop_idx on job_events (shop_id, created_at desc);

alter table job_events enable row level security;

-- Everyone in the shop sees the shop's history (they already see every
-- repair in it on "All jobs").
drop policy if exists "Shop members read the shop's history" on job_events;
create policy "Shop members read the shop's history"
  on job_events for select
  to authenticated
  using (shop_id = (select my_shop_id()));

-- No insert, update or delete policies: only the trigger below writes.

-- 2. Write a row whenever a repair changes ----------------------------------------
--
-- security definer: the trigger may write to job_events even though
-- nobody else can. It only ever copies facts from the repair itself.

create or replace function log_job_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.job_events (shop_id, job_id, actor, kind)
    values (new.shop_id, new.id, who, 'created');
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'picked_up' and old.amount_paid is null and new.amount_paid is not null then
      insert into public.job_events (shop_id, job_id, actor, kind, detail)
      values (new.shop_id, new.id, who, 'payment', new.status);
    else
      insert into public.job_events (shop_id, job_id, actor, kind, detail)
      values (new.shop_id, new.id, who, 'status', new.status);
    end if;
  end if;

  if new.handled_by is distinct from old.handled_by then
    insert into public.job_events (shop_id, job_id, actor, kind, detail)
    values (new.shop_id, new.id, who, 'reassigned', new.handled_by::text);
  end if;

  if old.estimate_status = 'pending' and new.estimate_status in ('approved', 'declined') then
    insert into public.job_events (shop_id, job_id, actor, kind, detail)
    values (new.shop_id, new.id, who, 'estimate_answer', new.estimate_status);
  end if;

  return new;
end;
$$;

revoke all on function log_job_event() from public, anon, authenticated;

drop trigger if exists jobs_log_events on jobs;
create trigger jobs_log_events
  after insert or update on jobs
  for each row execute function log_job_event();

-- 3. Back-fill, once ---------------------------------------------------------------

insert into job_events (shop_id, job_id, actor, kind, created_at)
select j.shop_id, j.id, j.quoted_by, 'created', j.created_at
from jobs j
where not exists (select 1 from job_events e where e.job_id = j.id);

insert into job_events (shop_id, job_id, actor, kind, detail, created_at)
select j.shop_id, j.id, j.handled_by, 'payment', 'picked_up', j.paid_at
from jobs j
where j.paid_at is not null
  and not exists (select 1 from job_events e where e.job_id = j.id and e.kind = 'payment');

commit;
