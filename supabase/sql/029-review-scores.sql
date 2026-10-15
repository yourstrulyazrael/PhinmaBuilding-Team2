-- 029 — review scores for the leaderboard (ticket 63)
--
-- The Reviews page ranks everyone in the shop by CSAT (share of 4–5 star
-- reviews) and DSAT (share of 1–2 star reviews). Staff may only read
-- reviews of their own work (028), so this function hands every member
-- of the shop just the COUNTS per person for a time range: no comments,
-- no repairs, no customers.
--
-- shop_review_scores(since, until): one row per technician who has a
-- review in the range, in the caller's own shop only.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 028 first.

begin;

create or replace function shop_review_scores(since timestamptz, until timestamptz)
returns table (
  technician_id uuid,
  reviews       integer,
  satisfied     integer,  -- 4 or 5 stars (CSAT)
  neutral       integer,  -- 3 stars
  dissatisfied  integer,  -- 1 or 2 stars (DSAT)
  average       numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.technician_id,
    count(*)::integer,
    count(*) filter (where r.rating >= 4)::integer,
    count(*) filter (where r.rating = 3)::integer,
    count(*) filter (where r.rating <= 2)::integer,
    round(avg(r.rating), 2)
  from public.reviews r
  where r.shop_id = public.my_shop_id()
    and r.created_at >= since
    and r.created_at < until
  group by r.technician_id;
$$;

revoke all on function shop_review_scores(timestamptz, timestamptz) from public, anon;
grant execute on function shop_review_scores(timestamptz, timestamptz) to authenticated;

commit;
