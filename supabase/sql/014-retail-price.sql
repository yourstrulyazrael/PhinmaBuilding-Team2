-- 014 — retail price, and prices recorded when parts are used (ticket 30)
--
--   1. parts.retail_price: what the customer is charged (shop-readable)
--   2. job_parts.unit_price: the retail price at the moment it was used
--   3. job_part_costs: the cost at that moment, owner only
--   4. the trigger that records both (nobody can type them in)
--
-- Prices are recorded when used, so changing a price later doesn't
-- rewrite past repairs or the analytics.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 013 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 1. Retail price ---------------------------------------------------

alter table parts add column if not exists retail_price numeric(10,2) not null default 0
  check (retail_price >= 0);

-- 2. The retail price when used -------------------------------------

alter table job_parts add column if not exists unit_price numeric(10,2) not null default 0
  check (unit_price >= 0);

-- 3. The cost when used: owner only, like all costs --------------------

create table if not exists job_part_costs (
  job_part_id uuid          primary key references job_parts (id) on delete cascade,
  unit_cost   numeric(10,2) not null default 0 check (unit_cost >= 0)
);

alter table job_part_costs enable row level security;

drop policy if exists "The owner can read costs of parts used" on job_part_costs;
create policy "The owner can read costs of parts used"
  on job_part_costs for select to authenticated
  using ((select i_own_my_shop()) and exists (
    select 1 from job_parts jp where jp.id = job_part_id and jp.shop_id = (select my_shop_id())));
-- No insert/update/delete policies: only the trigger below writes here.

-- Parts already recorded (before this ticket) get today's prices.
update job_parts jp set unit_price = p.retail_price from parts p where p.id = jp.part_id;
insert into job_part_costs (job_part_id, unit_cost)
select jp.id, coalesce(pc.cost, 0)
from job_parts jp left join part_costs pc on pc.part_id = jp.part_id
on conflict (job_part_id) do nothing;

-- 4. Record the prices when a part is used ----------------------------
-- Same checks as 013, plus: the retail price is copied from the part
-- (whatever the app sends is ignored), and after saving, the cost is
-- copied into job_part_costs.

create or replace function check_job_part()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select shop_id into new.shop_id from public.jobs where id = new.job_id;
  if not exists (select 1 from public.parts where id = new.part_id and shop_id = new.shop_id) then
    raise exception 'That part is not in this shop.';
  end if;
  select retail_price into new.unit_price from public.parts where id = new.part_id;
  return new;
end;
$$;

create or replace function record_job_part_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.job_part_costs (job_part_id, unit_cost)
  values (new.id, coalesce((select cost from public.part_costs where part_id = new.part_id), 0));
  return null;
end;
$$;

drop trigger if exists job_parts_record_cost on job_parts;
create trigger job_parts_record_cost
  after insert on job_parts
  for each row execute function record_job_part_cost();

revoke all on function record_job_part_cost() from public, anon, authenticated;

commit;
