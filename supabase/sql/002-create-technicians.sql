-- 002 — technicians
--
-- One row per technician account: the name and contact number shown on
-- every claim slip and tracking page.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists technicians (
  -- Same id as the technician's login account, so each account has at
  -- most one row. Deleting the account deletes the row.
  id             uuid        primary key references auth.users (id) on delete cascade,
  display_name   text        not null check (char_length(trim(display_name)) between 1 and 80),
  contact_number text        not null check (char_length(trim(contact_number)) between 1 and 40),
  created_at     timestamptz not null default now()
);

-- 2. Row Level Security --------------------------------------------
--
-- Only the signed-in technician may see or change their own row.
-- Signed-out visitors get nothing. Nobody may delete a row through the
-- app. (Customers will see the name and contact through a separate,
-- read-only database function in ticket 04, never through this table.)

alter table technicians enable row level security;

create policy "Technicians can read their own row"
  on technicians for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Technicians can add their own row"
  on technicians for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Technicians can update their own row"
  on technicians for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
