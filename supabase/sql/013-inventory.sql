-- 013 — parts and inventory (tickets 27–29)
--
--   1. parts: the catalog (SKU, name, stock, low-stock level)
--   2. part_costs: each part's cost, owner only
--   3. stock_movements: every + or − to stock; nobody can edit or delete
--   4. job_parts: parts used on a repair (deducts stock automatically)
--   5. the triggers that keep stock right
--   6. Row Level Security for all four
--   7. the tracking page lists the parts used
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 012 first. Runs as one transaction: if any step fails,
-- nothing changes.

begin;

-- 0. Helper: may the signed-in person change this job? ---------------
-- The owner: any job in their shop. Staff: jobs they handle. (The same
-- rule as the jobs table.)

create or replace function i_can_change_job(job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = job
      and j.shop_id = public.my_shop_id()
      and (public.i_own_my_shop() or j.handled_by = auth.uid())
  );
$$;

-- 1. Parts ----------------------------------------------------------

create table if not exists parts (
  id           uuid        primary key default gen_random_uuid(),
  shop_id      uuid        not null default my_shop_id() references shops (id) on delete cascade,
  sku          text        not null check (char_length(trim(sku)) between 1 and 40),
  name         text        not null check (char_length(trim(name)) between 1 and 100),
  -- Changed only by stock movements (section 5), never directly.
  quantity     integer     not null default 0,
  -- At or below this, the part shows as low stock.
  low_stock_at integer     not null default 2 check (low_stock_at between 0 and 9999),
  -- Archived parts are hidden from pickers but keep their history.
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (shop_id, sku)
);

-- 2. Costs: a separate table, so staff can't read them -----------------

create table if not exists part_costs (
  part_id uuid          primary key references parts (id) on delete cascade,
  cost    numeric(10,2) not null default 0 check (cost >= 0)
);

-- 3. Stock movements: the history -----------------------------------

create table if not exists stock_movements (
  id         uuid        primary key default gen_random_uuid(),
  shop_id    uuid        not null references shops (id) on delete cascade,
  part_id    uuid        not null references parts (id) on delete cascade,
  change     integer     not null check (change <> 0 and change between -9999 and 9999),
  reason     text        not null check (reason in ('restock', 'adjustment', 'used', 'returned')),
  job_id     uuid        references jobs (id) on delete set null,
  note       text        not null default '' check (char_length(note) <= 200),
  created_by uuid        default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_part_idx on stock_movements (part_id, created_at desc);
create index if not exists stock_movements_shop_idx on stock_movements (shop_id, created_at desc);

-- 4. Parts used on a repair -----------------------------------------

create table if not exists job_parts (
  id         uuid        primary key default gen_random_uuid(),
  shop_id    uuid        not null default my_shop_id() references shops (id) on delete cascade,
  job_id     uuid        not null references jobs (id) on delete cascade,
  part_id    uuid        not null references parts (id) on delete restrict,
  quantity   integer     not null check (quantity between 1 and 99),
  created_by uuid        default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists job_parts_job_idx on job_parts (job_id);
create index if not exists job_parts_part_idx on job_parts (part_id, created_at desc);

-- 5. Keeping stock right --------------------------------------------

-- 5a. Nobody sets a part's quantity directly: a new part starts at 0
-- (the app records its starting stock as a restock), and a change to
-- quantity is ignored unless it comes from a stock movement below.
create or replace function guard_part_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.quantity := 0;
  elsif coalesce(current_setting('zenith.stock_update', true), '') <> 'on' then
    new.quantity := old.quantity;
    new.shop_id := old.shop_id;
  end if;
  return new;
end;
$$;

drop trigger if exists parts_guard_quantity on parts;
create trigger parts_guard_quantity
  before insert or update on parts
  for each row execute function guard_part_quantity();

-- 5b. A movement always belongs to its part's shop, and a linked job
-- must be in that shop too.
create or replace function check_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select shop_id into new.shop_id from public.parts where id = new.part_id;
  if new.job_id is not null and not exists (
    select 1 from public.jobs where id = new.job_id and shop_id = new.shop_id
  ) then
    raise exception 'That repair is not in this shop.';
  end if;
  return new;
end;
$$;

drop trigger if exists stock_movements_check on stock_movements;
create trigger stock_movements_check
  before insert on stock_movements
  for each row execute function check_stock_movement();

-- 5c. Every movement moves the part's stock.
create or replace function apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('zenith.stock_update', 'on', true);
  update public.parts set quantity = quantity + new.change where id = new.part_id;
  perform set_config('zenith.stock_update', 'off', true);
  return null;
end;
$$;

drop trigger if exists stock_movements_apply on stock_movements;
create trigger stock_movements_apply
  after insert on stock_movements
  for each row execute function apply_stock_movement();

-- 5d. Parts used on a repair: same shop as the job, and they make a
-- "used" movement (or "returned" when removed). Security definer, so
-- staff can record parts used without being allowed to restock.
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
  return new;
end;
$$;

create or replace function move_stock_for_job_part()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stock_movements (shop_id, part_id, change, reason, job_id, created_by)
    values (new.shop_id, new.part_id, -new.quantity, 'used', new.job_id, auth.uid());
    return null;
  end if;
  insert into public.stock_movements (shop_id, part_id, change, reason, job_id, created_by)
  values (old.shop_id, old.part_id, old.quantity, 'returned', old.job_id, auth.uid());
  return null;
end;
$$;

drop trigger if exists job_parts_check on job_parts;
create trigger job_parts_check
  before insert on job_parts
  for each row execute function check_job_part();

drop trigger if exists job_parts_move_stock on job_parts;
create trigger job_parts_move_stock
  after insert or delete on job_parts
  for each row execute function move_stock_for_job_part();

-- 6. Row Level Security ---------------------------------------------

alter table parts enable row level security;
alter table part_costs enable row level security;
alter table stock_movements enable row level security;
alter table job_parts enable row level security;

-- Parts: the whole shop reads; only the owner adds or edits. No delete
-- policy: parts are archived, so their history stays.
drop policy if exists "Members can read their shop's parts" on parts;
create policy "Members can read their shop's parts"
  on parts for select to authenticated
  using (shop_id = (select my_shop_id()));

drop policy if exists "The owner can add parts" on parts;
create policy "The owner can add parts"
  on parts for insert to authenticated
  with check (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

drop policy if exists "The owner can edit parts" on parts;
create policy "The owner can edit parts"
  on parts for update to authenticated
  using (shop_id = (select my_shop_id()) and (select i_own_my_shop()))
  with check (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

-- Costs: the owner only, for parts in their shop.
drop policy if exists "The owner can read costs" on part_costs;
create policy "The owner can read costs"
  on part_costs for select to authenticated
  using ((select i_own_my_shop()) and exists (
    select 1 from parts p where p.id = part_id and p.shop_id = (select my_shop_id())));

drop policy if exists "The owner can add costs" on part_costs;
create policy "The owner can add costs"
  on part_costs for insert to authenticated
  with check ((select i_own_my_shop()) and exists (
    select 1 from parts p where p.id = part_id and p.shop_id = (select my_shop_id())));

drop policy if exists "The owner can change costs" on part_costs;
create policy "The owner can change costs"
  on part_costs for update to authenticated
  using ((select i_own_my_shop()) and exists (
    select 1 from parts p where p.id = part_id and p.shop_id = (select my_shop_id())))
  with check ((select i_own_my_shop()) and exists (
    select 1 from parts p where p.id = part_id and p.shop_id = (select my_shop_id())));

-- Movements: the shop reads; the owner records restocks and
-- adjustments. "used"/"returned" come only from job_parts (section 5d).
-- No update or delete policies: the history can't be changed.
drop policy if exists "Members can read their shop's stock history" on stock_movements;
create policy "Members can read their shop's stock history"
  on stock_movements for select to authenticated
  using (shop_id = (select my_shop_id()));

drop policy if exists "The owner can restock and adjust" on stock_movements;
create policy "The owner can restock and adjust"
  on stock_movements for insert to authenticated
  with check (
    shop_id = (select my_shop_id())
    and (select i_own_my_shop())
    and reason in ('restock', 'adjustment')
  );

-- Parts used: the shop reads; the owner or the job's handler adds and
-- removes them. No update: remove and add again.
drop policy if exists "Members can read parts used" on job_parts;
create policy "Members can read parts used"
  on job_parts for select to authenticated
  using (shop_id = (select my_shop_id()));

drop policy if exists "Who can change the job can add parts" on job_parts;
create policy "Who can change the job can add parts"
  on job_parts for insert to authenticated
  with check (i_can_change_job(job_id));

drop policy if exists "Who can change the job can remove parts" on job_parts;
create policy "Who can change the job can remove parts"
  on job_parts for delete to authenticated
  using (i_can_change_job(job_id));

-- Function access: signed-in people only; trigger functions, nobody.
revoke all on function i_can_change_job(uuid) from public, anon;
grant execute on function i_can_change_job(uuid) to authenticated;
revoke all on function guard_part_quantity() from public, anon, authenticated;
revoke all on function check_stock_movement() from public, anon, authenticated;
revoke all on function apply_stock_movement() from public, anon, authenticated;
revoke all on function check_job_part() from public, anon, authenticated;
revoke all on function move_stock_for_job_part() from public, anon, authenticated;

-- 7. Tracking page: the parts used, by name --------------------------
-- Same as 008, plus parts_used, e.g. "LCD screen, Battery ×2". Never
-- cost or SKU.

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
  parts_used           text,
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
    (
      select string_agg(p.name || case when jp.quantity > 1 then ' ×' || jp.quantity else '' end, ', ' order by jp.created_at)
      from public.job_parts jp
      join public.parts p on p.id = jp.part_id
      where jp.job_id = j.id
    ),
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
