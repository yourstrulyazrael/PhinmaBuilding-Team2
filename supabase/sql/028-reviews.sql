-- 028 — customers review the technician after pickup (ticket 62)
--
-- After a repair is picked up, the customer can rate the technician who
-- handled it (1 to 5 stars, optional comment), once, from their tracking
-- page. No account: the private tracking link is what proves it's them.
--
-- Reviews are private to the shop:
--   * each technician reads the reviews of their own work
--   * the owner reads every review in their shop
--   * nobody can write, change or delete one directly: only the
--     customer's function below adds them
--
--   1. reviews (one per repair)
--   2. submit_review(code, rating, comment): the customer's action
--   3. get_tracking_page (from 027): also returns their rating, if any
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 027 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. Reviews ----------------------------------------------------------------

create table if not exists reviews (
  id             uuid        primary key default gen_random_uuid(),
  shop_id        uuid        not null references shops (id) on delete cascade,
  job_id         uuid        not null unique references jobs (id) on delete cascade,
  technician_id  uuid        not null references technicians (id) on delete cascade,
  rating         integer     not null check (rating between 1 and 5),
  comment        text        not null default '' check (char_length(comment) <= 500),
  created_at     timestamptz not null default now()
);

create index if not exists reviews_shop_id_idx on reviews (shop_id, created_at desc);
create index if not exists reviews_technician_id_idx on reviews (technician_id, created_at desc);

alter table reviews enable row level security;

drop policy if exists "Technicians read reviews of their work" on reviews;
create policy "Technicians read reviews of their work"
  on reviews for select
  to authenticated
  using (technician_id = (select auth.uid()) and shop_id = (select my_shop_id()));

drop policy if exists "The owner reads the shop's reviews" on reviews;
create policy "The owner reads the shop's reviews"
  on reviews for select
  to authenticated
  using (shop_id = (select my_shop_id()) and (select i_own_my_shop()));

-- No insert, update or delete policies: only submit_review writes.

-- 2. The customer leaves a review ---------------------------------------------
--
-- Anyone with the tracking code may call it, like get_tracking_page. Only
-- for a picked-up repair, and only once. The review goes to whoever was
-- handling the repair.

create or replace function submit_review(code text, rating integer, comment text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.jobs;
  note text := left(trim(coalesce(comment, '')), 500);
begin
  select * into job from public.jobs j where j.tracking_code = code;
  if job.id is null then
    raise exception 'This link isn''t valid.';
  end if;
  if job.status <> 'picked_up' then
    raise exception 'You can leave a review once you''ve picked up your phone.';
  end if;
  if rating is null or rating < 1 or rating > 5 then
    raise exception 'Pick 1 to 5 stars.';
  end if;
  if exists (select 1 from public.reviews r where r.job_id = job.id) then
    raise exception 'You''ve already reviewed this repair. Thank you!';
  end if;

  insert into public.reviews (shop_id, job_id, technician_id, rating, comment)
  values (job.shop_id, job.id, job.handled_by, rating, note);
end;
$$;

revoke all on function submit_review(text, integer, text) from public;
grant execute on function submit_review(text, integer, text) to anon, authenticated;

-- 3. The tracking page: as in 027, plus review_rating -------------------------

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
  technician_name      text,
  shop_address         text,
  parts_total          numeric,
  parts_lines          jsonb,
  shop_currency        text,
  warranty_until       date,
  shop_hours           text,
  review_rating        integer
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
    coalesce(nullif(trim(s.phone), ''), owner.contact_number),
    handler.display_name,
    s.address,
    j.parts_total,
    -- Name, quantity and price of each part: never the shop's cost.
    coalesce((
      select jsonb_agg(jsonb_build_object('name', p.name, 'quantity', jp.quantity, 'unit_price', jp.unit_price) order by jp.created_at)
      from public.job_parts jp
      join public.parts p on p.id = jp.part_id
      where jp.job_id = j.id
    ), '[]'::jsonb),
    s.currency,
    -- Warranty end date (Manila), once picked up and if the shop gives one.
    case when j.paid_at is not null and s.warranty_days > 0
      then (j.paid_at at time zone 'Asia/Manila')::date + s.warranty_days end,
    s.hours,
    -- The customer's own rating, if they left one (ticket 62).
    (select r.rating from public.reviews r where r.job_id = j.id)
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
