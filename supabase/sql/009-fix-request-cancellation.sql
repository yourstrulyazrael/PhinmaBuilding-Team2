-- 009 — fix: request_cancellation always reported success
--
-- In 008, the "did anything change?" check ran after a second
-- set_config call, which overwrites Postgres's FOUND flag. So a made-up
-- code, a finished repair or a second request was silently accepted
-- (nothing changed in the database, but the customer got no message).
-- This version counts the changed rows first.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.

create or replace function request_cancellation(code text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  perform set_config('zenith.customer_action', 'on', true);

  update public.jobs
  set cancel_requested_at = now(),
      cancel_reason = left(trim(coalesce(reason, '')), 300)
  where tracking_code = code
    and cancel_requested_at is null
    and status not in ('picked_up', 'cancelled');
  get diagnostics changed = row_count;

  perform set_config('zenith.customer_action', 'off', true);

  if changed = 0 then
    raise exception 'This repair is finished, or a cancellation was already requested.';
  end if;
end;
$$;

revoke all on function request_cancellation(text, text) from public;
grant execute on function request_cancellation(text, text) to anon, authenticated;
