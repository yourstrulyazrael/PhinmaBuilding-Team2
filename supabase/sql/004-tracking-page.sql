-- 004 — tracking codes and the public tracking page
--
-- Gives every repair job a long random tracking code, and adds one
-- read-only function the public tracking page uses to look a job up by
-- that code.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The tracking code ----------------------------------------------
--
-- 32 random letters and digits (from a random UUID), e.g.
-- 9f1c2a7e4b3d4e8f9a0b1c2d3e4f5a6b. Far too many possibilities to
-- guess. Existing jobs each get their own code when this runs.

alter table jobs
  add column if not exists tracking_code text not null unique
    default replace(gen_random_uuid()::text, '-', '');

-- The database always makes the code itself and never lets it change,
-- so a printed QR code keeps working and nobody can pick an easy one.
create or replace function lock_tracking_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.tracking_code = replace(gen_random_uuid()::text, '-', '');
  else
    new.tracking_code = old.tracking_code;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_lock_tracking_code on jobs;
create trigger jobs_lock_tracking_code
  before insert or update on jobs
  for each row execute function lock_tracking_code();

-- 2. The tracking page function -------------------------------------
--
-- Customers have no account, and RLS rightly stops them reading the
-- jobs table (it holds every customer's name and phone number).
--
-- This function is the one safe door: give it a tracking code, get back
-- that ONE job's customer-safe details plus the technician's name and
-- contact. It never returns customer_name or customer_phone. A wrong
-- code returns nothing.
--
-- "security definer" lets it read past RLS, which is why it must only
-- ever return the columns listed below.

create or replace function get_tracking_page(code text)
returns table (
  device             text,
  problem            text,
  status             text,
  initial_quote      numeric,
  revised_estimate   numeric,
  notes              text,
  parts_replaced     text,
  promised_date      date,
  updated_at         timestamptz,
  technician_name    text,
  technician_contact text
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
    j.notes,
    j.parts_replaced,
    j.promised_date,
    j.updated_at,
    t.display_name,
    t.contact_number
  from public.jobs j
  join public.technicians t on t.id = j.technician_id
  where j.tracking_code = code
  limit 1;
$$;

-- Anyone may call it, signed in or not.
revoke all on function get_tracking_page(text) from public;
grant execute on function get_tracking_page(text) to anon, authenticated;
