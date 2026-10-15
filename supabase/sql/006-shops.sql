-- 006 — shops (phase 2, ticket 11)
--
-- A shop is an owner plus (from ticket 12) their apprentices, sharing
-- one set of repair jobs. This file:
--   1. adds the shops and shop_members tables, with RLS
--   2. adds "start a shop", the only way to create one
--   3. moves every existing account into a shop of its own, as owner
--   4. moves jobs into shops, with handled_by and quoted_by
--   5. switches the jobs security rules from "my jobs" to "my shop's jobs"
--   6. makes the tracking page show the shop's name and contact
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 002–005 first. It runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Tables ---------------------------------------------------------

create table if not exists shops (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(trim(name)) between 1 and 80),
  -- One shop per owner.
  owner_id   uuid        not null unique references technicians (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists shop_members (
  -- The primary key is the technician, so a person can be in at most
  -- one shop.
  technician_id uuid        primary key references technicians (id) on delete cascade,
  shop_id       uuid        not null references shops (id) on delete cascade,
  role          text        not null check (role in ('owner', 'apprentice')),
  joined_at     timestamptz not null default now()
);

create index if not exists shop_members_shop_id_idx on shop_members (shop_id);

-- 2. Helpers used by the security rules ------------------------------
--
-- "Which shop am I in?" and "Am I its owner?". They are security
-- definer so the rules below can ask without tripping over
-- shop_members' own rules (which would loop forever otherwise).

create or replace function my_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select shop_id from public.shop_members where technician_id = auth.uid();
$$;

create or replace function i_own_my_shop()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where technician_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function my_shop_id() from public;
revoke all on function i_own_my_shop() from public;
grant execute on function my_shop_id() to authenticated;
grant execute on function i_own_my_shop() to authenticated;

-- 3. Row Level Security on the new tables ----------------------------

alter table shops enable row level security;
alter table shop_members enable row level security;

-- Members can see their own shop. Only the owner can rename it, and
-- cannot hand it to someone else. Nobody creates or deletes a shop
-- directly: "start a shop" (below) is the only way in.
drop policy if exists "Members can read their shop" on shops;
create policy "Members can read their shop"
  on shops for select
  to authenticated
  using (id = (select my_shop_id()));

drop policy if exists "The owner can rename their shop" on shops;
create policy "The owner can rename their shop"
  on shops for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Members can see who else is in their shop. There are deliberately NO
-- insert, update or delete policies: nobody, not even the owner, can
-- change membership directly, so nobody can make themselves owner.
drop policy if exists "Members can read their shopmates" on shop_members;
create policy "Members can read their shopmates"
  on shop_members for select
  to authenticated
  using (shop_id = (select my_shop_id()));

-- Shopmates' names appear on jobs, so members may read each other's
-- technicians row. Changing a row is still only allowed on your own
-- (the policies from 002 are unchanged).
drop policy if exists "Technicians can read their shopmates" on technicians;
create policy "Technicians can read their shopmates"
  on technicians for select
  to authenticated
  using (id in (select technician_id from shop_members where shop_id = (select my_shop_id())));

-- 4. Start a shop ---------------------------------------------------
--
-- Creates a shop and makes the caller its owner. The caller must have
-- saved their name and contact first, and must not already be in a shop.

create or replace function start_shop(shop_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_shop uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;
  if not exists (select 1 from public.technicians where id = auth.uid()) then
    raise exception 'Save your name and contact number first.';
  end if;
  if exists (select 1 from public.shop_members where technician_id = auth.uid()) then
    raise exception 'You are already in a shop.';
  end if;

  insert into public.shops (name, owner_id)
  values (trim(shop_name), auth.uid())
  returning id into new_shop;

  insert into public.shop_members (technician_id, shop_id, role)
  values (auth.uid(), new_shop, 'owner');

  return new_shop;
end;
$$;

revoke all on function start_shop(text) from public;
grant execute on function start_shop(text) to authenticated;

-- 5. Every existing account becomes the owner of its own shop ----------

insert into shops (name, owner_id)
select display_name, id
from technicians t
where not exists (select 1 from shops s where s.owner_id = t.id);

insert into shop_members (technician_id, shop_id, role)
select s.owner_id, s.id, 'owner'
from shops s
where not exists (select 1 from shop_members m where m.technician_id = s.owner_id);

-- 6. Jobs belong to a shop ------------------------------------------
--
-- technician_id becomes handled_by (who is responsible for the phone
-- now), and quoted_by records who gave the initial quote. All three are
-- filled in by the database when a job is added: the adding person's
-- shop, and the adding person.

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'jobs' and column_name = 'technician_id') then
    alter table public.jobs rename column technician_id to handled_by;
  end if;
end;
$$;

-- Removing someone's account must never delete the shop's jobs.
alter table jobs drop constraint if exists jobs_technician_id_fkey;
alter table jobs drop constraint if exists jobs_handled_by_fkey;
alter table jobs
  add constraint jobs_handled_by_fkey foreign key (handled_by) references technicians (id) on delete restrict;

alter table jobs add column if not exists quoted_by uuid references technicians (id) on delete restrict;
alter table jobs add column if not exists shop_id uuid references shops (id) on delete restrict;

-- Fill in existing jobs WITHOUT touching updated_at (Analytics uses it)
-- or pinging open tracking pages.
alter table jobs disable trigger jobs_set_updated_at;
alter table jobs disable trigger jobs_notify_tracking_page;

update jobs j
set shop_id = s.id,
    quoted_by = coalesce(j.quoted_by, j.handled_by)
from shops s
where s.owner_id = j.handled_by
  and (j.shop_id is null or j.quoted_by is null);

alter table jobs enable trigger jobs_set_updated_at;
alter table jobs enable trigger jobs_notify_tracking_page;

alter table jobs alter column handled_by set default auth.uid();
alter table jobs alter column quoted_by set default auth.uid();
alter table jobs alter column shop_id set default my_shop_id();
alter table jobs alter column quoted_by set not null;
alter table jobs alter column shop_id set not null;

alter index if exists jobs_technician_id_idx rename to jobs_handled_by_idx;
create index if not exists jobs_shop_id_idx on jobs (shop_id);

-- 7. Jobs security rules: "my shop's jobs" ---------------------------
--
-- Read: everyone in the shop. Add: into your own shop, handled and
-- quoted by yourself. Change: the owner, any job in the shop; anyone
-- else, only jobs they handle (ticket 12 adds the column limits for
-- apprentices). Delete: nobody.

drop policy if exists "Technicians can read their own jobs" on jobs;
drop policy if exists "Technicians can add their own jobs" on jobs;
drop policy if exists "Technicians can update their own jobs" on jobs;
drop policy if exists "Members can read their shop's jobs" on jobs;
drop policy if exists "Members can add jobs to their shop" on jobs;
drop policy if exists "Members can update jobs they may change" on jobs;

create policy "Members can read their shop's jobs"
  on jobs for select
  to authenticated
  using (shop_id = (select my_shop_id()));

create policy "Members can add jobs to their shop"
  on jobs for insert
  to authenticated
  with check (
    shop_id = (select my_shop_id())
    and handled_by = (select auth.uid())
    and quoted_by = (select auth.uid())
  );

create policy "Members can update jobs they may change"
  on jobs for update
  to authenticated
  using (
    shop_id = (select my_shop_id())
    and ((select i_own_my_shop()) or handled_by = (select auth.uid()))
  )
  with check (shop_id = (select my_shop_id()));

-- 8. Tracking page: the shop's name and contact ----------------------
--
-- Returns the shop name, the OWNER's contact number and the handling
-- technician's name. Still never the customer's name or phone.

drop function if exists get_tracking_page(text);
create function get_tracking_page(code text)
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
  shop_name          text,
  shop_contact       text,
  technician_name    text
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
