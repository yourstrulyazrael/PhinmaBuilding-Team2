# 09 — Instant tracking-page updates

**What to build:** when the technician changes a job, the customer's
open tracking page updates within a second or two, by itself. Added
after the MVP, from `docs/LATER.md`.

**Blocked by:** 05

**Status:** todo

How it stays private: customers have no account, and the `jobs` table
holds every customer's name and phone, so customers must never listen
to that table. Instead, a database trigger sends an empty "changed"
signal on a private channel named after the job's secret tracking code.
The page then re-fetches through `get_tracking_page`, exactly as before.

- [ ] `supabase/sql/005-instant-tracking-updates.sql` adds the trigger
      and a Realtime policy, and has been run on the hosted project
- [ ] The signal carries no job data, not even the status
- [ ] Signed-out visitors can listen on `track:<tracking code>` channels
      only, and cannot send on any channel
- [ ] Changing a status updates an open tracking page on another phone
      within about two seconds, without touching it
- [ ] Editing notes, parts or the revised estimate updates it too
- [ ] If the live connection drops, the page still re-checks every 15
      seconds
- [ ] Works on the live URL
