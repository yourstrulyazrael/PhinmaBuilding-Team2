# 19 — Record payment at pickup

**What to build:** setting a job to "Picked up" asks how much the
customer paid and how (cash, GCash or other), and saves it on the job.
Analytics counts what was actually paid.

**Blocked by:** None

**Status:** todo

- [ ] Choosing "Picked up" (Jobs list or Job detail) opens a payment
      box: amount (starting at the current price) and method
- [ ] Closing the box without saving leaves the status unchanged
- [ ] Saving sets Picked up and records the payment in one step
- [ ] Job detail shows "Paid ₱X by <method> on <date>"
- [ ] Analytics "Earned" uses the amount paid
- [ ] Apprentices can record payment on jobs they handle
- [ ] No money moves through the app: it is a record only
- [ ] Works on the live URL
