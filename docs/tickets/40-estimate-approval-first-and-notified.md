# 40 — Estimate approval first on the tracking page, and the shop is told

**What to build:** the customer sees the "approve the new estimate"
request before anything else, and the shop finds out when they approve.

**Blocked by:** 39

**Status:** done (check on the live URL)

- [x] Tracking page: a revised estimate waiting for an answer is the
      first thing under the shop's name, above the status
- [x] When the customer approves, Notifications shows "Customer approved
      the revised estimate of ₱…: you can carry on with the repair", and
      the bell counts it
- [x] Only the owner and the person handling that repair see it; other
      staff don't
- [x] It shows on the day the customer answered and the next day, then
      drops off by itself (reminders are worked out fresh each time, so
      there is nothing to dismiss); not for finished repairs
- [x] No database change
- [ ] On the live URL: revise an estimate, approve it from the tracking
      page, and check the owner's and the handler's bells
