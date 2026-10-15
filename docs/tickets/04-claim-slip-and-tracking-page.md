# 04 — Claim slip and public tracking page

**What to build:** after saving a new job, the technician sees its claim
slip with a QR code and can print it. A customer scans the QR with their
own phone and sees their repair's tracking page, with no login.

**Blocked by:** 03

**Status:** done

- [x] Every job gets a long random tracking code made by the database;
      the job's id never appears in the tracking link
- [x] The `get_tracking_page` database function returns only the
      customer-safe fields and the technician's name and contact, and
      anyone may call it
- [x] The database change is saved as a numbered file in the repo
- [x] Saving a new job opens its claim slip: device, problem, initial
      quote, revised estimate (if any), promised date, technician's
      contact and QR code
- [x] The claim slip never shows the customer's name or phone number
- [x] Print opens the device's normal print screen with a clean slip
- [x] Scanning the QR on another phone opens the tracking page showing
      status "Received"
- [x] The tracking page never shows the customer's name or phone number
- [x] A made-up tracking link shows "No repair found"
- [x] Works on the live URL
