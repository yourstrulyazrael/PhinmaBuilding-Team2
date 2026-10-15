# Zenith Repair

## Who
A small cellphone repair shop: the **owner** (our technician teammate)
and the **apprentices** who work under them (the exact number varies;
apprentices come and go). The owner usually has 3–5 phones in progress
at once (more in busy weeks, while phones wait for diagnosis, parts or
pickup).

Phase 1 (built, tickets 01–10) served the owner working on their own.
Phase 2 adds the apprentices, each with their own limited account.

## The struggle
- **The technician's side (our teammate's real incident):** A customer
  asked for an update on their phone. Our teammate had to scroll back
  through Messenger to remember the repair details and the price they had
  agreed. They also lost track of which repairs were still ongoing and
  which customers they had already updated. It wasted time, made them
  look disorganised, and risked the customer's trust.
- **The customer's side (a teammate who left a phone for repair):** They
  had no way of knowing what was happening or when the phone would be
  ready, so they had to wait for the technician to message them. The
  status, the expected cost and the pickup date were all unclear.
- **The shop's side (phase 2, observed in our teammate's shop):**
  - **Price mix-ups:** different people in the shop told a customer
    different prices.
  - **Abandoned phones:** a phone was left unattended because nobody
    knew it was theirs, and the customer waited for nothing.

## Today's workaround
Messenger conversations and personal notes. Repair details, quotes and
progress are spread across chats, so finding one job means scrolling.
A spreadsheet could track jobs, but it cannot update customers, and the
customer has no way to check on their own.

Inside the shop: a group chat and shouting across the room. Neither can
enforce who is responsible for a phone, or who gave a price.

## The MVP
**Phase 1 (built):** the technician logs each repair job, gives the
customer a claim slip with a QR code, and updates the status with one
tap. The customer scans the QR to see their own phone's status, so they
no longer need to message and ask.

- Customers scan and view, with no account.
- Statuses: Received, Diagnosing, Waiting for parts, Repairing, Ready for
  pickup, and Picked up. Any status can be set directly.
- Claim slip: shows the initial quote and any revised estimate and can be
  **printed** (the device's normal print screen) or **saved as an image**
  (to send on Messenger later).
- **Copy update message** button: copies a ready-made update with the
  tracking link, for pasting into Messenger.
- The tracking page shows: device, problem, initial quote, any revised
  estimate, diagnosis/repair notes, parts replaced, status, promised date,
  the shop's contact. It **never** shows the customer's name or phone
  number, and its link must be impossible to guess.
- Each repair has a detail page with customer-visible diagnosis/repair
  notes and parts replaced, and any status can be selected directly.
- If diagnosis changes the estimate, a revised expected total is shown
  alongside the initial quote. The revised cost is confirmed with the
  customer before proceeding.

**Phase 2 (next): every phone has a named person handling it and a
named person who quoted it, and apprentices get their own limited
accounts so they can run jobs without seeing the owner's private
information.**

- **Joining and leaving:** the owner shares a shop **invite code**;
  apprentices sign up with it. The owner can **remove** an apprentice;
  that apprentice's jobs go back to the owner.
- **Handled by:** every job always has one person handling it: whoever
  created it, unless the owner **reassigns** it. Everyone in the shop
  sees every job, labelled with who is handling it; **My jobs** is the
  default view.
- **Editing:** apprentices can create jobs, and change the status, notes
  and parts replaced on **their own** jobs only. The owner can edit any
  job.
- **Prices:** apprentices enter the initial quote, and the job shows
  **Quoted by**. Only the **owner** can change the revised estimate.
- **Owner only:** Analytics and earnings, Shop settings, staff
  management and the Customers list.
- **What customers see:** the claim slip and tracking page show the
  shop's name and the owner's contact number, plus "Your technician:
  <name>" with no number. Still never the customer's name or phone.

## How we'll know it worked
**Phase 1 demo (3 minutes):** the technician adds a job → a QR appears →
a judge scans it with their own phone and sees "Received" → the
technician taps "Ready for pickup" → the judge's page changes by itself.

**Phase 2 demo (only if finished and tested in time):** an apprentice
signs in and adds a job ("Quoted by Jun") → the owner's screen shows it
"Handled by Jun" → the apprentice taps "Ready for pickup" and the
judge's tracking page updates instantly → the apprentice tries to open
Analytics and is refused.

**Before Session 3:** our technician teammate uses it for real repair
jobs. For phase 2: the owner and at least one real apprentice use it for
real jobs for a week.

**Timing:** finish ticket 07 first, so the phase 1 demo is safe. Then
build phase 2.

**Known risk:** our only tester is on the team, so their feedback may be
biased toward what we already planned. We should try to get one technician
who isn't on the team to try it, even for 10 minutes.

## Out of scope
- Built-in printer support (we use the device's normal print screen only)
- Automatic SMS or Messenger delivery (the local preview only queues messages
  for manual copying)
- Customer accounts and ratings
- Phase 2:
  - A full activity history log (beyond "Quoted by" and "Handled by")
  - More than one shop per owner
  - Apprentices seeing earnings, or other staff's account details
  - Email invites (would need a paid email service)
  - Inventory

## Current local-preview extensions

The current prototype also includes repair intake details (serial number,
accessories, condition and photos), customer estimate approval, payment
entries and printable receipts, parts inventory and usage, warranty terms and
claim logs, repair activity history, a local notification outbox, customer
profiles derived from repair records, overdue and awaiting-pickup alerts,
basic operational analytics, technician assignments, and shop/status-label
customization.

These are browser-local prototype workflows, not shared production services.
Jobs, customer decisions, photos, payments, inventory, notifications and
settings stay in the current browser profile. There is no cross-device sync,
payment processing, automated message delivery, multi-user authentication or
permission enforcement. Analytics are indicative only, and a printed preview
receipt is not proof of an electronic payment. Do not use the prototype as a
system of record for live customer data or financial reporting.

## Glossary
- **Shop**: the owner plus their apprentices, sharing one set of repair
  jobs.
- **Owner**: runs the shop; one per shop. Sees and controls everything.
  (In phase 1 this was the "independent technician", working alone.)
- **Apprentice (staff)**: a technician working under the owner, with
  their own limited account.
- **Handled by**: the one person currently responsible for a phone.
- **Quoted by**: the person who gave the customer the initial quote.
- **Invite code**: a code the owner shares so an apprentice can join
  their shop.
- **Repair job**: one customer's device, brought in for one repair, from
  drop-off to pickup.
- **Initial quote**: the estimated repair price shared with the customer
  before work begins.
- **Revised estimate**: the updated expected total after diagnosis. Only
  the owner can set it, and the amount is confirmed with the customer
  before proceeding.
- **Status**: where a repair job is right now. One of Received,
  Diagnosing, Waiting for parts, Repairing, Ready for pickup, Picked up.
- **Claim slip**: given to the customer at drop-off. It shows the device,
  problem, initial quote, any revised estimate, promised date and QR code.
  Can be printed or saved as an image.
- **Receipt**: printable local-preview summary of recorded payments; not a
  payment processor receipt.
- **Tracking page**: a read-only web page for one repair job, opened by
  scanning its QR code. No login. It never shows the customer's name or
  phone number.
- **Copy update message**: a button that copies a ready-made status
  update with the tracking link, for pasting into Messenger.
