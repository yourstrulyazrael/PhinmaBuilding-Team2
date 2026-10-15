# 18 — Cancelled status and cancellation requests

**What to build:** "Cancelled" is a 7th status. Customers can request a
cancellation from their tracking page, and the shop decides: cancel the
repair, or keep repairing.

**Blocked by:** None

**Status:** todo

- [ ] Cancelled can be set like any other status, and cancelled jobs sit
      in the Done section, out of open counts and alerts
- [ ] The tracking page has "Request cancellation" (optional reason, up
      to 300 characters) while the repair is not finished
- [ ] After requesting, the tracking page says the shop will contact
      them, and the button is gone
- [ ] Job detail shows the request and reason, with "Cancel the repair"
      and "Keep repairing"; it also appears in Notifications
- [ ] A cancelled repair's tracking page clearly says it was cancelled
- [ ] Only the customer can make a request; a shop account can only
      clear one, even with a hand-made request
- [ ] Works on the live URL
