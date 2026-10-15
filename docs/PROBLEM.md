# Zenith Repair

## Who
An independent cellphone repair technician: one person doing repairs on
their own, with no shop counter and no staff. Specifically, our teammate,
who usually has 3–5 phones in progress at once (more in busy weeks, while
phones wait for diagnosis, parts or pickup).

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

## Today's workaround
Messenger conversations and personal notes. Repair details, quotes and
progress are spread across chats, so finding one job means scrolling.
A spreadsheet could track jobs, but it cannot update customers, and the
customer has no way to check on their own.

## The MVP
The technician logs each repair job, gives the customer a claim slip with
a QR code, and updates the status with one tap. The customer scans the QR
to see their own phone's status, so they no longer need to message and ask.

- Only the technician logs in. Customers scan and view, with no account.
- Statuses: Received, Diagnosing, Waiting for parts, Repairing, Ready for
  pickup, and Picked up. The technician can set any status directly.
- Claim slip: shows the initial quote and any revised estimate and can be
  **printed** (the device's normal print screen) or **saved as an image**
  (to send on Messenger later).
- **Copy update message** button: copies a ready-made update with the
  tracking link, for the technician to paste into Messenger.
- The tracking page shows: device, problem, initial quote, any revised
  estimate, diagnosis/repair notes, parts replaced, status, promised date,
  technician's contact. It **never** shows the customer's name or phone
  number, and its link must be impossible to guess.
- Each repair has a detail page where the technician can add customer-visible
  diagnosis/repair notes and parts replaced, and directly select any repair
  status without following a fixed sequence.
- The copy update message includes the initial quote and tracking link. If
  diagnosis changes the estimate, the technician can update the revised
  expected total, which is shown alongside the initial quote. The technician
  confirms the revised cost with the customer before proceeding.

## How we'll know it worked
**Demo (3 minutes):** the technician adds a job → a QR appears → a judge
scans it with their own phone and sees "Received" → the technician taps
"Ready for pickup" → the judge refreshes and sees it change.

**Before Session 3:** our technician teammate uses it for real repair jobs.

**Known risk:** our only tester is on the team, so their feedback may be
biased toward what we already planned. We should try to get one technician
who isn't on the team to try it, even for 10 minutes.

## Out of scope
- Built-in printer support (we use the device's normal print screen only)
- Automatic SMS or Messenger delivery (the local preview only queues messages
  for manual copying)
- Customer accounts and ratings

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
- **Independent technician**: one person doing repairs alone, without a
  shop or staff. Our only user who logs in.
- **Repair job**: one customer's device, brought in for one repair, from
  drop-off to pickup.
- **Initial quote**: the estimated repair price shared with the customer
  before work begins.
- **Revised estimate**: the updated expected total after diagnosis. The
  technician confirms the amount with the customer before proceeding.
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
