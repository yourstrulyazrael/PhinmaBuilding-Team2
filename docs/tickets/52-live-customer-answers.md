# 52 — Customer answers arrive live; the customer gets a confirmation

**What to build:** the shop sees a customer's approval, decline or
cancel request without reloading, with a message for the people it
concerns; the customer sees that their answer went through.

**Blocked by:** 51

**Status:** in progress (needs `supabase/sql/025-live-customer-answers-for-the-shop.sql` run)

- [x] When a customer approves or declines a revised quote, or asks to
      cancel, every open page of that shop refreshes straight away (the
      repair page, the list, the bell)
- [x] The owner and the repair's handler also get a pop-up in the corner
      (approved / declined / asked to cancel, the device, "Open the
      repair"); it fades after 12 seconds or can be dismissed
- [x] The message travels on a private channel only that shop's signed-in
      members can listen to; it carries no customer details or reasons;
      nobody can send on it from a browser
- [x] The customer's page shows "Thank you! You approved…" or "Got it.
      You declined…" after answering
- [x] The 30-second refresh stays as a backup
- [ ] Run 025; on the live URL, with the repair open on one device,
      approve and decline from the tracking page on another, and watch it
      update and the pop-up appear without reloading
