# 05 — Job detail and status updates

**What to build:** the technician opens a repair job, sets any status
with one tap, and adds customer-visible notes, parts replaced, a revised
estimate and a new promised date. The customer sees the changes on the
tracking page after refreshing.

**Blocked by:** 04

**Status:** done

- [x] Tapping a job on the Jobs list opens its Job detail screen
- [x] All six statuses can be set directly, in any order
- [x] The status picker on the Jobs list changes a job's status without
      opening the job (a dropdown: tidier on a phone than six buttons;
      Job detail has the one-tap buttons)
- [x] Notes, parts replaced, revised estimate and promised date can be
      edited and saved
- [x] The revised estimate cannot be negative and can be left empty
- [x] The tracking page shows the new status, notes, parts replaced and
      the revised estimate next to the initial quote
- [x] Job detail has a link back to the claim slip
- [x] Works on the live URL
