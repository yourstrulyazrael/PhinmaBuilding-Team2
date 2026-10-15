-- 025 — the shop hears customer answers live (ticket 52)
--
-- When a customer approves or declines a revised quote, or asks to
-- cancel, every open page of that shop refreshes straight away and the
-- owner and the repair's handler see a message, instead of waiting for
-- a reload.
--
-- Same idea as 005 (tracking pages):
--   * a trigger sends a small message on a PRIVATE Realtime channel
--     named after the shop, "shop:<shop id>"
--   * only signed-in members of that shop may listen (policy below);
--     nobody can send on it from a browser (no insert policy)
--   * the message says which repair and what happened, and the device
--     name for the pop-up; never customer details or reasons (the page
--     re-reads those itself, through RLS)
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 024 first.

begin;

create or replace function notify_shop_of_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  what text;
begin
  if new.estimate_status is distinct from old.estimate_status
     and new.estimate_status in ('approved', 'declined') then
    what := 'estimate_' || new.estimate_status;
  elsif new.cancel_requested_at is not null and old.cancel_requested_at is null then
    what := 'cancel_requested';
  else
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object('event', what, 'job_id', new.id, 'device', new.device, 'handled_by', new.handled_by),
    'customer',                          -- event name the app listens for
    'shop:' || new.shop_id::text,        -- channel (topic)
    true                                 -- private: the policy below applies
  );
  return null;
exception when others then
  -- A failed message must never stop the customer's answer. The app's
  -- 30-second refresh picks it up anyway.
  raise warning 'notify_shop_of_customer: %', sqlerrm;
  return null;
end;
$$;

revoke all on function notify_shop_of_customer() from public, anon, authenticated;

drop trigger if exists jobs_notify_shop_of_customer on jobs;
create trigger jobs_notify_shop_of_customer
  after update on jobs
  for each row execute function notify_shop_of_customer();

-- Only the shop's own current members may listen to "shop:<their shop>".
drop policy if exists "Shop members hear their shop's customer answers" on realtime.messages;
create policy "Shop members hear their shop's customer answers"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'shop:' || (select public.my_shop_id())::text
  );

commit;
