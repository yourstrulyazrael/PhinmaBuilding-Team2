# Spec: Zenith Repair

Phase 1 (tickets 01–10) is built and live: one technician working on
their own. **Phase 2** (this update) turns that technician into the
**owner** of a small **shop** and lets their **apprentices** sign in with
limited accounts. Phase 2 is built only after ticket 07 (demo-ready).

## Problem
I run a small phone repair shop with a few apprentices, and we usually
have 3–5 phones in progress at once. When a customer asks for an update,
I have to scroll back through Messenger to find the repair details and
the price we agreed. Inside the shop we coordinate by group chat and
shouting across the room, so different people have told a customer
different prices, and phones have sat unattended because nobody knew
they were theirs. Customers have no way to check on their phone
themselves, so they wait for us to message them.

## Solution
We log each repair job, give the customer a claim slip with a QR code,
and update the status with one tap. The customer scans the QR to see
their phone's status, quote and promised date, without an account and
without messaging us. When we do want to message them, we tap "Copy
update message" and paste it into Messenger.

In phase 2, every phone shows who is **handling** it and who **quoted**
it. Apprentices sign in with their own limited accounts: they can add
jobs and work on their own, but only the owner can change revised
estimates, reassign phones, manage staff and see the shop's earnings.

## The user
The shop's technicians: one **owner** and their **apprentices**. Both do
the same core job (logging and updating repairs); the owner simply has
more rights. We design and test around our teammate (the owner) and at
least one real apprentice. Customers never log in; they only view a
**tracking page**.

## User stories
1. As a technician, I want to add a repair job with the customer's
   details, device, problem, initial quote and promised date, and hand
   over a claim slip with a QR code, so that we stop relying on
   Messenger history.
2. As a technician, I want to set any status with one tap and add
   notes, parts replaced and (as owner) a revised estimate, so that the
   customer sees what was found and what it will cost.
3. As a technician, I want to copy a ready-made update message with the
   tracking link, so that I can paste it into Messenger.
4. As a customer, I want to scan the QR and see my phone's status
   without an account, so that I do not have to message and ask.
5. As an owner, I want to share an invite code so that my apprentices
   can join my shop, and remove them when they leave, so that only
   current staff can see our jobs.
6. As an apprentice, I want "My jobs" to show the phones I am handling,
   so that I know exactly which phones are mine and none get forgotten.
7. As an owner, I want every job to show who quoted it, and to be the
   only one who can change a revised estimate, so that customers are
   never told two different prices.
8. As an owner, I want to reassign a phone to someone else, so that
   work continues when an apprentice is away.

## Screens
1. **Sign in / Sign up**: email and password, with a switch between "I
   have an account" and "Create an account".
2. **Set up** (phase 2; shown once, after signing up): name and contact
   number, then either **Start a shop** (becomes its owner; asks for a
   shop name) or **Join a shop** (type the owner's invite code; becomes
   an apprentice).
3. **Jobs list** (home screen): tabs **My jobs** (the default), **All
   jobs**, Ready and Waiting on parts, soonest promised date first. Each
   row shows the device, customer name, status, promised date and
   **Handled by**, plus a status dropdown on jobs the user may change.
   An "Add a repair" button. Picked-up jobs sit in a collapsed "Done"
   section. A search box (device, problem, customer name or phone) and
   a sort menu (promised date, newest, oldest, customer name).
4. **New job**: customer name, customer phone, device, problem, initial
   quote (₱) and promised date. The job is handled by and quoted by
   whoever creates it. Saving opens its claim slip.
5. **Claim slip**: device, problem, initial quote, revised estimate (if
   any), promised date, the **shop name and owner's contact**, "Your
   technician: <name>", and the QR code. **Print** and **Save as image**
   buttons. Never the customer's name or phone.
6. **Job detail**: everything about the job, including **Handled by**
   and **Quoted by**. Any of the six statuses can be set directly; notes,
   parts replaced and promised date can be edited; **Copy update
   message**; link to the claim slip. Apprentices can edit only their
   own jobs; other jobs are read-only to them. Only the **owner** sees a
   **Reassign to** dropdown and can edit the **revised estimate**.
7. **Tracking page** (public, no login, opened by scanning the QR):
   device, problem, status, initial quote, revised estimate, notes,
   parts replaced, promised date, the shop name, the owner's contact and
   "Your technician: <name>". Never the customer's name or phone. A
   wrong link shows "No repair found". It updates within a second or two
   of any change, and still re-checks every 15 seconds as a backup.
8. **Workspace**: the **owner** sees every tab: **Customers**,
   **Notifications**, **Analytics** and **Shop settings** (their own
   name and contact, the shop name, the **invite code** with a "Make a
   new code" button, and the **Staff** list with **Remove** next to each
   apprentice). An **apprentice** sees only **Notifications**. Both see
   the **Overdue & awaiting pickup** panel. Owner-only tabs refuse
   apprentices, even if they type the address.
9. **Not in a shop**: a removed apprentice sees "You're not in a shop"
   and can join one with a new invite code.

## Data

**`shops`**: one row per shop.
- `id`, `name`, `owner_id`, `created_at`
- Read: members of the shop. Update (name only): the owner. Insert: only
  through the "start a shop" database function. Delete: nobody.

**`shop_invites`**: the shop's current invite code, kept apart so
apprentices cannot see or pass it on.
- `shop_id`, `code` (long and random, made by the database), `created_at`
- Read and replace the code: the owner only. Nobody else, ever.

**`shop_members`**: who belongs to which shop.
- `shop_id`, `technician_id`, `role` (owner or apprentice), `joined_at`
- A technician belongs to at most one shop.
- Read: members of the same shop (so names can be shown on jobs).
- Insert, update, delete: **nobody directly**, not even the owner, so an
  apprentice can never make themselves owner. Changes happen only
  through three database functions: **start a shop**, **join with an
  invite code**, and **remove an apprentice** (owner only; their jobs
  move back to the owner).

**`technicians`**: one row per technician account.
- `id` (their account id), `display_name`, `contact_number`,
  `created_at`
- Read: themselves and members of their shop. Insert and update: only
  themselves, on their own row. Delete: nobody.

**`jobs`**: one row per repair job.
- `id`, `shop_id`, `handled_by` (replaces phase 1's `technician_id`),
  `quoted_by`, `customer_name`, `customer_phone`, `device`, `problem`,
  `initial_quote` (pesos, 0 or more), `revised_estimate` (pesos,
  optional), `notes`, `parts_replaced`, `status`, `promised_date`,
  `tracking_code`, `created_at`, `updated_at`
- `status` is one of: Received, Diagnosing, Waiting for parts,
  Repairing, Ready for pickup, Picked up. A new job starts at Received.
- `tracking_code` is long and random, made by the database, never
  changes, and is the only thing in the QR link.
- Read: every member of the job's shop.
- Insert: any member, into their own shop, with `handled_by` and
  `quoted_by` both set to themselves.
- Update: the **owner** may change anything on any job in their shop.
  An **apprentice** may change only jobs they handle, and only `status`,
  `notes`, `parts_replaced` and `promised_date`. The database itself
  rejects an apprentice changing prices, `handled_by`, `quoted_by` or
  `shop_id`, so a hand-crafted request from a browser cannot get round
  it.
- Delete: nobody.

**`get_tracking_page`** (a database function): anyone may call it with
a tracking code. It returns one job's customer-safe fields, the shop
name, the owner's contact number and the handling technician's name.
Never the customer's name or phone. A wrong code returns nothing.

**Instant updates**: after any job update, the database sends an empty
"changed" signal on a private channel named after the tracking code.
Anyone may listen on such channels; nobody may send.

**Moving phase 1 data:** a one-time step makes each existing account the
owner of its own shop (named after them) and moves its jobs in, with
`handled_by` and `quoted_by` set to that owner.

**Privacy:** customer names and phones are visible only to members of
the shop that holds the job. Apprentices see each job's prices; the
shop's totals (earnings, Analytics) are owner-only screens.

## Login
Yes, for the owner and apprentices. Supabase Auth with email and
password, with "Confirm email" turned off so that no emails are sent.
Apprentices join a shop with an invite code, not an email invite.
Customers never need an account.

## Done for the demo
On the **live Vercel URL**.

Phase 1 (ticket 07, must pass first):
- [ ] Sign up, sign in and sign out work.
- [ ] Adding a job opens its claim slip with a QR code, which prints and
      saves as an image.
- [ ] A judge scans the QR with their own phone and sees "Received",
      with no customer name or phone number on the page.
- [ ] The technician taps "Ready for pickup" and the judge's page
      changes by itself.
- [ ] "Copy update message" copies a message with the tracking link.
- [ ] A made-up tracking link shows "No repair found".
- [ ] Signed out, you cannot read any job; another shop's account cannot
      see this shop's jobs.

Phase 2 (only shown if finished and tested in time):
- [ ] The owner shares the invite code; an apprentice joins with it.
- [ ] The apprentice adds a job; it shows "Quoted by" and "Handled by"
      the apprentice, and the owner sees it in All jobs.
- [ ] The apprentice taps "Ready for pickup"; the judge's tracking page
      updates instantly and shows "Your technician: <apprentice>".
- [ ] The apprentice cannot change the revised estimate, cannot edit
      another person's job, and is refused when opening Analytics.
- [ ] The owner reassigns a job, and removes an apprentice; the removed
      apprentice's jobs go back to the owner and they can no longer see
      the shop's jobs.
- [ ] After "Make a new code", the old invite code no longer works.
- [ ] The owner and at least one real apprentice have used it for real
      jobs for a week.

## Out of scope
- Built-in printer support (we use the device's normal print screen)
- Automatic SMS or Messenger delivery, and email invites (both need a
  paid service)
- Customer accounts and ratings
- Deleting repair jobs
- A full activity history log (phase 2 records only "Quoted by" and
  "Handled by")
- More than one shop per owner, or one person in several shops
- Inventory, intake photos, payments and receipts, warranty, estimate
  approval (see `docs/LATER.md`)
