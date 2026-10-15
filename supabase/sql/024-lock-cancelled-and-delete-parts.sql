-- 024 — cancelled repairs are final; the owner can delete parts (ticket 51)
--
--   1. A cancelled repair can't be changed any more: no status, notes,
--      prices, dates, payment, staff or parts changes, by anyone, however
--      the request is made. (The app also shows it read-only.)
--   2. delete_part(part_id): the owner deletes a part for good, with its
--      stock history and cost. Refused if the part was ever used on a
--      repair: past repairs, slips and reports need its name and price,
--      so the message says how many repairs and to archive it instead.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 023 first. One transaction: if any step fails, nothing changes.

begin;

-- 1. Cancelled is final --------------------------------------------------------

create or replace function lock_cancelled_job()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'cancelled' then
    raise exception 'This repair was cancelled, so it can''t be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_lock_cancelled on jobs;
create trigger jobs_lock_cancelled
  before update on jobs
  for each row execute function lock_cancelled_job();

-- No parts added to, or taken off, a cancelled repair.
create or replace function lock_cancelled_job_parts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.jobs
    where id = coalesce(new.job_id, old.job_id) and status = 'cancelled'
  ) then
    raise exception 'This repair was cancelled, so its parts can''t be changed.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists job_parts_lock_cancelled on job_parts;
create trigger job_parts_lock_cancelled
  before insert or delete on job_parts
  for each row execute function lock_cancelled_job_parts();

-- 2. Delete a part (owner only) ------------------------------------------------

create or replace function delete_part(part_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if not public.i_own_my_shop() then
    raise exception 'Only the shop owner can delete parts.';
  end if;
  if not exists (
    select 1 from public.parts p
    where p.id = delete_part.part_id and p.shop_id = public.my_shop_id()
  ) then
    raise exception 'That part is not in your shop.';
  end if;

  select count(distinct jp.job_id) into used
  from public.job_parts jp
  where jp.part_id = delete_part.part_id;
  if used > 0 then
    raise exception 'Used on % repair%. Archive it instead, so those repairs keep its name and price.',
      used, case when used = 1 then '' else 's' end;
  end if;

  -- Its cost and stock history go with it (on delete cascade).
  delete from public.parts p where p.id = delete_part.part_id;
end;
$$;

revoke all on function delete_part(uuid) from public, anon;
grant execute on function delete_part(uuid) to authenticated;

commit;
