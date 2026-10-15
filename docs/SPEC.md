# Spec: Zenith Repair

## Problem
I repair phones on my own and usually have 3–5 in progress at once. When
a customer asks for an update, I have to scroll back through Messenger
to find the repair details and the price we agreed, and I lose track of
which repairs are still ongoing. My customers have no way to check on
their phone themselves, so they wait for me to message them.

## Solution
I log each repair job, give the customer a claim slip with a QR code,
and update the status with one tap. The customer scans the QR to see
their phone's status, quote and promised date, without an account and
without messaging me. When I do want to message them, I tap "Copy update
message" and paste it into Messenger.

## The user
An **independent technician**: one person doing repairs alone, with no
shop counter and no staff. We design and test around our teammate. They
are the only user who logs in. Customers only view a **tracking page**.

## User stories
1. As an independent technician, I want to sign in with my email and
   password, so that only I can see and change my repair jobs.
2. As an independent technician, I want to add a repair job with the
   customer's details, device, problem, initial quote and promised date,
   so that I stop relying on Messenger history.
3. As an independent technician, I want a claim slip with a QR code that
   I can print or save as an image, so that the customer can track their
   phone.
4. As an independent technician, I want to see all my ongoing repair
   jobs and their statuses in one list, so that I know what is still in
   progress.
5. As an independent technician, I want to set any status with one tap,
   so that updating a job takes seconds.
6. As an independent technician, I want to add notes, parts replaced and
   a revised estimate, so that the customer sees what was found and what
   it will cost.
7. As an independent technician, I want to copy a ready-made update
   message with the tracking link, so that I can paste it into Messenger.
8. As a customer, I want to scan the QR and see my phone's status
   without an account, so that I do not have to message and ask.

## Screens
1. **Sign in / Sign up** (technician only): email and password, with a
   switch between "I have an account" and "Create an account".
2. **Jobs list** (the technician's home screen): ongoing repair jobs,
   soonest promised date first. Each row shows the device, customer
   name, status and promised date, plus a status picker for one-tap
   changes. A "New job" button. Picked-up jobs sit in a collapsed "Done"
   section at the bottom. A search box finds jobs by device, problem,
   customer name or phone, and a sort menu orders the list by promised
   date, newest or oldest added, or customer name (ticket 08).
3. **New job**: form for customer name, customer phone, device, problem,
   initial quote (₱) and promised date. Saving opens that job's claim
   slip.
4. **Claim slip**: device, problem, initial quote, revised estimate (if
   any), promised date, the technician's contact details and the QR
   code. **Print** (the device's normal print screen) and **Save as
   image** buttons. It does not show the customer's name or phone
   number.
5. **Job detail**: everything about the job. The technician can pick any
   of the six statuses directly; edit the diagnosis/repair notes, parts
   replaced, revised estimate and promised date; tap **Copy update
   message** (device, status, initial quote, revised estimate if any,
   tracking link); and open the claim slip again.
6. **My details**: the technician's display name and contact number,
   shown on every claim slip and tracking page.
7. **Tracking page** (public, no login, opened by scanning the QR):
   device, problem, status, initial quote, revised estimate, notes,
   parts replaced, promised date and the technician's contact. It never
   shows the customer's name or phone number. A wrong link shows "No
   repair found". While open, it updates within a second or two of any
   change (Supabase Realtime, ticket 09), and still re-checks every 15
   seconds as a backup, so the customer never has to refresh.

## Data

**`technicians`**: one row per technician account.
- `id` (their account id), `display_name`, `contact_number`,
  `created_at`
- Read, insert, update: only the technician, on their own row. Delete:
  nobody.

**`jobs`**: one row per repair job.
- `id`, `technician_id` (the owner), `customer_name`, `customer_phone`,
  `device`, `problem`, `initial_quote` (pesos, 0 or more),
  `revised_estimate` (pesos, optional), `notes` (customer-visible
  diagnosis/repair notes), `parts_replaced`, `status`, `promised_date`,
  `tracking_code`, `created_at`, `updated_at`
- `status` must be one of: Received, Diagnosing, Waiting for parts,
  Repairing, Ready for pickup, Picked up. A new job starts at Received.
- `tracking_code` is a long random code made by the database. It is the
  only thing in the QR link, so the link cannot be guessed. The job's
  `id` never appears in it.
- Read, insert, update: only the owning technician, on their own jobs
  (`technician_id` must be themselves). Delete: nobody through the app.

**`get_tracking_page`** (a database function, not a table): customers
never read `jobs` directly, because a "anyone may read" rule would also
expose every customer's name and phone number. Instead, the tracking
page calls this function with a tracking code. Anyone may call it. It
returns one job's customer-safe fields plus the technician's display
name and contact number, and nothing else. A wrong code returns nothing.

**Privacy:** customer names and phone numbers are only ever visible to
the technician who owns the job.

## Login
Yes, for the technician only. Supabase Auth with email and password,
with "Confirm email" turned off so that no emails are sent (the free
plan's email limit would otherwise break sign-ups during testing).
Customers never need an account.

## Done for the demo
On the **live Vercel URL**:
- [ ] The technician can create an account, sign in and sign out.
- [ ] The technician can save their display name and contact number.
- [ ] Adding a job opens its claim slip with a QR code.
- [ ] The claim slip prints through the normal print screen and saves as
      an image.
- [ ] A judge scans the QR with their own phone and sees "Received",
      with no customer name or phone number on the page.
- [ ] The technician taps "Ready for pickup"; within 15 seconds the
      judge's page changes by itself.
- [ ] Any status can be set directly, in any order.
- [ ] Notes, parts replaced and a revised estimate show on the tracking
      page, with the revised estimate next to the initial quote.
- [ ] "Copy update message" copies a message with the tracking link.
- [ ] A made-up tracking link shows "No repair found".
- [ ] RLS is on for both tables. Signed out, you cannot read any job; a
      second technician account cannot see the first one's jobs.
- [ ] Our technician teammate has used it for real repair jobs, and we
      have tried to get one technician outside the team to try it.

## Out of scope
- Everything in the "Current local-preview extensions" section of
  PROBLEM.md: intake photos and accessories, customer estimate approval,
  payments and receipts, parts inventory, warranty, activity history,
  notification outbox, customer profiles, alerts, analytics, technician
  assignments and shop settings (see `docs/LATER.md`)
- Built-in printer support (we use the device's normal print screen)
- Automatic SMS or Messenger delivery
- Customer accounts and ratings
- Deleting repair jobs
