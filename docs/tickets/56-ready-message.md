# 56 — "Ready for pickup" message in one tap

**What to build:** when a repair is marked Ready for pickup, the repair
page shows the message to send the customer, with a copy button.

**Blocked by:** 44 (opening hours in 027)

**Status:** in progress (opening hours need `supabase/sql/027-reassign-hours-warranty.sql`)

- [x] A green "Ready for pickup: tell the customer" box on the repair page
      while it's Ready, with the message and **Copy ready message**
- [x] The message: the device, the shop's name, the total to pay (quote +
      parts), the address and opening hours (if set), "Please bring your
      claim slip", and the tracking link; never the customer's details
- [x] Account → Store details → Opening hours; the owner sees a tip if
      they're missing
- [ ] Works on the live URL
