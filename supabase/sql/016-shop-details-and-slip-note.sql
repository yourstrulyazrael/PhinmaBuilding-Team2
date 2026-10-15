-- 016 — shop address, shop phone and a claim-slip note (ticket 34)
--
-- The owner edits these on the Account page:
--   address    shown on the claim slip and the tracking page
--   phone      the shop's own number; if empty, the owner's number is
--              used, as before
--   slip_note  printed at the bottom of every claim slip, e.g. "Unclaimed
--              devices after 30 days are not our responsibility."
--
-- Security: no new policies needed. Members can already read their shop
-- and only the owner can update it (policies from 006). The public
-- tracking page still reads nothing directly; it goes through
-- get_tracking_page, which now also returns the address and the shop
-- phone.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 013 first.

begin;

alter table shops
  add column if not exists address   text not null default '' check (char_length(address) <= 200),
  add column if not exists phone     text not null default '' check (char_length(phone) <= 40),
  add column if not exists slip_note text not null default '' check (char_length(slip_note) <= 500);

-- Same as in 013, plus shop_address; shop_contact is now the shop's own
-- phone when it has one, otherwise the owner's number.
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
  shop_address         text
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
    s.address
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
