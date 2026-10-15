-- 026 — the owner picks the shop's currency (ticket 54)
--
--   1. shops.currency: PHP unless the owner changes it on Account. Only
--      the listed currency codes are accepted. Updated by the owner only
--      (the shop update policy from 006 already covers it).
--   2. get_tracking_page (from 023): also returns the shop's currency, so
--      the customer's page shows amounts the same way.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 025 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. The currency ----------------------------------------------------------

alter table shops add column if not exists currency text not null default 'PHP'
  check (currency in (
    'PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'IDR', 'THB', 'VND',
    'HKD', 'AUD', 'CAD', 'KRW', 'CNY', 'INR', 'AED', 'SAR'
  ));

-- 2. The tracking page: as in 023, plus shop_currency ------------------------

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
  shop_currency        text
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
    s.currency
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
