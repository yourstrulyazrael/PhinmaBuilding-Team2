-- 003 — jobs
--
-- One row per repair job: one customer's device, from drop-off to
-- pickup.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists jobs (
  id               uuid          primary key default gen_random_uuid(),
  -- The owner. Must be a technician who has filled in My details.
  -- Defaults to whoever is signed in.
  technician_id    uuid          not null default auth.uid()
                                 references technicians (id) on delete cascade,
  customer_name    text          not null check (char_length(trim(customer_name)) between 1 and 100),
  customer_phone   text          not null check (char_length(trim(customer_phone)) between 1 and 40),
  device           text          not null check (char_length(trim(device)) between 1 and 100),
  problem          text          not null check (char_length(trim(problem)) between 1 and 500),
  -- Pesos. Cannot be negative.
  initial_quote    numeric(10,2) not null check (initial_quote >= 0),
  -- Empty until diagnosis changes the price.
  revised_estimate numeric(10,2) check (revised_estimate >= 0),
  -- Customer-visible diagnosis/repair notes and parts replaced.
  notes            text          not null default '' check (char_length(notes) <= 2000),
  parts_replaced   text          not null default '' check (char_length(parts_replaced) <= 500),
  -- Only these six statuses are allowed. Every new job starts at
  -- 'received'.
  status           text          not null default 'received'
                                 check (status in (
                                   'received',
                                   'diagnosing',
                                   'waiting_for_parts',
                                   'repairing',
                                   'ready_for_pickup',
                                   'picked_up'
                                 )),
  promised_date    date          not null,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

-- Speeds up "show me my jobs".
create index if not exists jobs_technician_id_idx on jobs (technician_id);

-- Keep updated_at correct on every change, without relying on the app.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

-- 2. Row Level Security --------------------------------------------
--
-- A technician may only see, add and change their own jobs. Signed-out
-- visitors get nothing: customer names and phone numbers stay private.
-- Nobody may delete a job through the app. Customers will see their
-- own job's safe details through a read-only database function in
-- ticket 04, never through this table.

alter table jobs enable row level security;

create policy "Technicians can read their own jobs"
  on jobs for select
  to authenticated
  using ((select auth.uid()) = technician_id);

create policy "Technicians can add their own jobs"
  on jobs for insert
  to authenticated
  with check ((select auth.uid()) = technician_id);

create policy "Technicians can update their own jobs"
  on jobs for update
  to authenticated
  using ((select auth.uid()) = technician_id)
  with check ((select auth.uid()) = technician_id);
