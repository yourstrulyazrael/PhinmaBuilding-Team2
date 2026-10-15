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
5. As an owner, I want to create my apprentices' accounts myself
   whenever someone starts, and remove them when they leave, so that only
   current staff can see our jobs.
6. As an apprentice, I want "My jobs" to show the phones I am handling,
   so that I know exactly which phones are mine and none get forgotten.
7. As an owner, I want every job to show who quoted it, and to be the
   only one who can change a revised estimate, so that customers are
   never told two different prices.
8. As an owner, I want to reassign a phone to someone else, so that
   work continues when an apprentice is away.

## Screens
1. **Sign in / Set up your store**: email and password. Nobody can create
   an account on their own (ticket 35): "Have a store code? Set up your
   store" also asks for a **store code** the developer gave the owner.
2. **Set up** (phase 2; shown once, after signing up): name, contact
   number and shop name; **Start a shop** makes them its owner. Staff
   never see this screen: the owner creates their accounts (ticket 22).
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
   wrong link shows "No repair found". When the revised estimate is
   waiting, the customer can **Approve** or **Decline** it. While the
   repair is not finished, they can **Request cancellation** (with an
   optional reason). A cancelled repair says so. If the repair is past its
   promised date and not ready, it shows a "running late" apology with
   the original date (ticket 21). It updates within a second or two
   of any change, and still re-checks every 15 seconds as a backup.
8. **Workspace**: the **owner** sees every tab: **Customers**,
   **Notifications** and **Staff** (the staff list, each one's "Can revise
   estimates" switch, **Add staff** and **Remove**). Settings live on
   **Account** (ticket 34; was My details), opened from the avatar in the
   top bar: everyone edits their name, contact number, sign-in email and
   password; the owner also edits the store details (name, address, shop
   phone) and a note printed at the bottom of every claim slip. The slip
   and tracking page show the address and the shop phone (or the owner's
   number if the shop has none).
11. **Inventory** (tickets 27–29; top bar, owner and staff): the parts
   catalog (SKU, name, stock, low-stock level; cost for the owner only),
   low-stock flags, restocks and adjustments (owner), the stock history,
   and the most used parts for Today / 7 / 30 days. Job detail gains
   **Parts used**, which deducts stock; the tracking page lists them.
   Parts have a cost (owner only) and a retail price; the owner imports
   and exports the inventory as CSV, Excel or JSON, with templates
   (tickets 30–31). Analytics and Reports show parts sold, cost and
   profit.
10. **Reports & analytics** (owner only; one page in the top bar,
   tickets 26 and 33; the old Analytics address redirects to it): Today,
   the last 7 or 30 days, or a whole month; statistics (including open
   repairs right now) with smooth line charts beneath, then jobs by
   status, most common devices and payment methods. It
   lists every job received in the period (no customer phone numbers)
   and exports as Excel (.xlsx) or PDF (ticket 25). An **apprentice** sees only **Notifications**. Both see
   the **Overdue & awaiting pickup** panel. Owner-only tabs refuse
   apprentices, even if they type the address.
9. **Not in a shop**: a removed apprentice sees "You're not in a shop"
   and is told to ask a shop owner.

## Data

**`shops`**: one row per shop.
- `id`, `name`, `owner_id`, `created_at`
- Read: members of the shop. Update (name only): the owner. Insert: only
  through the "start a shop" database function. Delete: nobody.

**`shop_members`**: who belongs to which shop.
- `shop_id`, `technician_id`, `role` (owner or apprentice), `joined_at`,
  `can_revise_estimate` (off by default; only the owner can switch it,
  through a database function)
- A technician belongs to at most one shop.
- Read: members of the same shop (so names can be shown on jobs).
- Insert, update, delete: **nobody directly**, not even the owner, so an
  apprentice can never make themselves owner. Changes happen only
  through three database functions: **start a shop**, **add staff**
  (owner only; only a brand-new account, made in the last 10 minutes and
  in no shop), and **remove an apprentice** (owner only; their jobs
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
  `notes`, `parts_replaced`, `promised_date`, the payment record and
  clearing a cancellation request. (Ticket 17–19 additions.) The database itself
  rejects an apprentice changing prices (except the revised estimate,
  for staff the owner has allowed: `shop_members.can_revise_estimate`,
  ticket 23), `handled_by`, `quoted_by` or
  `shop_id`, so a hand-crafted request from a browser cannot get round
  it.
- **Status** also allows **Cancelled** (a 7th status; like Picked up,
  it counts as finished).
- **Estimate approval** (ticket 17): `estimate_status` (waiting,
  approved or declined) and `estimate_answered_at`. Setting or changing
  the revised estimate resets it to waiting. Only the customer can
  answer, through `answer_estimate`; the database ignores any shop
  account trying to set it.
- **Cancellation request** (ticket 18): `cancel_requested_at` and
  `cancel_reason` (up to 300 characters). Only the customer can make a
  request, through `request_cancellation`; the shop can only clear it.
  Setting Cancelled or Picked up clears it.
- **Payment** (tickets 19–20): `amount_paid` (pesos), `payment_method`
  (cash, e-wallet or card; older records may say "other"),
  `payment_ref` (the last 4 digits of the reference number, required
  for e-wallet and card, never for cash; shop-only) and `paid_at` (set
  by the database). A record only: no money moves through the app.

**`parts`** (ticket 27): `id`, `shop_id`, `sku` (unique in the shop), `name`,
`category` (ticket 32),
`quantity` (changed only by stock movements), `low_stock_at`, `active`.
Read: the shop. Write: the owner. Delete: nobody (archive instead).

**`part_costs`**: `part_id`, `cost`. Owner only, read and write: kept
apart from `parts` so staff can't read costs. `parts.retail_price` (ticket 30) is
the selling price, readable by the shop.

**`stock_movements`**: `part_id`, `change` (+/−), `reason` (restock,
adjustment, used, returned), `job_id`, `note`, `created_by`,
`created_at`. Read: the shop. Insert: the owner (restock, adjustment);
"used" and "returned" are made by the database from `job_parts`.
Update/delete: nobody.

**`job_parts`** (ticket 28): `job_id`, `part_id`, `quantity`. `unit_price` records
the retail price when used (ticket 30); the cost then is kept in the
owner-only **`job_part_costs`** (`job_part_id`, `unit_cost`). Read: the
shop. Insert/delete: the owner or the job's handler.

**`answer_estimate`** and **`request_cancellation`** (database
functions): anyone with a tracking code may call them. Each does only
its one job, on that one job, and only while the job is not finished.

**`get_tracking_page`**) (a database function): anyone may call it with
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
The owner creates apprentices' accounts in Workspace → Staff (email and a
temporary password); apprentices can then change their password. This
uses the normal sign-up, not the `service_role` key.
Customers never need an account.

**Sign-ups are closed** (ticket 35). The database refuses any new account
unless it brings either a **store code** (made by the developer in the
SQL Editor with `select new_store_code('who it is for');`, works once,
lets that account start one shop) or a **staff ticket** (made by the
owner's Add staff, works once, for 10 minutes, for that owner's shop).
All stores share one Supabase project and are kept apart by RLS: every
row belongs to a shop and people only ever see their own.

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
- [ ] The owner creates an apprentice's account; the apprentice signs in.
- [ ] The apprentice adds a job; it shows "Quoted by" and "Handled by"
      the apprentice, and the owner sees it in All jobs.
- [ ] The apprentice taps "Ready for pickup"; the judge's tracking page
      updates instantly and shows "Your technician: <apprentice>".
- [ ] The apprentice cannot change the revised estimate, cannot edit
      another person's job, and is refused when opening Analytics.
- [ ] The owner reassigns a job, and removes an apprentice; the removed
      apprentice's jobs go back to the owner and they can no longer see
      the shop's jobs.
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
- Intake photos, receipts, warranty, suppliers and purchase orders (see
  `docs/LATER.md`)
- Online payments: payment is recorded by hand at pickup
