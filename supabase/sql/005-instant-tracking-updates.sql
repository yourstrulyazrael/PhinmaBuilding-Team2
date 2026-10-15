-- 005 — instant tracking-page updates
--
-- When a job changes, tell that job's open tracking page to re-check,
-- straight away instead of at the next 15-second check.
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 004 first (it uses the tracking code).
--
-- How it stays private:
--   * Customers have no account, and the jobs table holds every
--     customer's name and phone. So customers never listen to the
--     table itself.
--   * Instead, this trigger sends an EMPTY "changed" message on a
--     private channel named after the job's secret tracking code,
--     e.g. "track:9f1c2a7e…". The page then asks get_tracking_page for
--     the details, exactly as it always has.
--   * Only someone who already has the tracking link knows the channel
--     name, and the message has nothing in it to steal anyway.

-- 1. The trigger ----------------------------------------------------
--
-- "security definer" lets the trigger post the message even though the
-- signed-in technician has no right to post on Realtime channels
-- themselves.

create or replace function notify_tracking_page()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    '{}'::jsonb,                      -- payload: deliberately empty
    'changed',                        -- event name the page listens for
    'track:' || new.tracking_code,    -- channel (topic)
    true                              -- private: Realtime policies apply
  );
  return null;
exception when others then
  -- A failed notification must never stop the technician's save. The
  -- page's 15-second check will pick the change up anyway.
  raise warning 'notify_tracking_page: %', sqlerrm;
  return null;
end;
$$;

revoke all on function notify_tracking_page() from public;

drop trigger if exists jobs_notify_tracking_page on jobs;
create trigger jobs_notify_tracking_page
  after update on jobs
  for each row execute function notify_tracking_page();

-- 2. Who may listen -------------------------------------------------
--
-- Realtime checks this table's RLS when someone joins a private
-- channel. Anyone (signed in or not) may LISTEN to broadcast messages
-- on a channel named "track:" + exactly 32 letters/digits.
--
-- There is deliberately no insert policy, so nobody in a browser can
-- SEND on these channels and fake an update.

drop policy if exists "Tracking pages can listen for changes" on realtime.messages;
create policy "Tracking pages can listen for changes"
  on realtime.messages
  for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^track:[0-9a-f]{32}$'
  );
