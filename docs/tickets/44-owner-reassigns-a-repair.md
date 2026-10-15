# 44 — Owner reassigns a repair

**What to build:** the owner moves a repair to another person in the
shop, for example when someone is off sick. This is the "Reassign to"
dropdown from the spec, left over from ticket 14.

**Blocked by:** 43

**Status:** in progress (needs `supabase/sql/027-reassign-hours-warranty.sql` run)

- [x] On a repair's page, the owner sees "Reassign to", listing themself
      and every current staff member; removed staff are not listed
- [x] Staff never see it, and the database refuses a reassignment from
      anyone but the owner, even sent directly
- [x] The database refuses to hand a repair to someone outside the shop
      or to a removed staff member
- [x] After reassigning, the repair shows the new "Handled by"; the new
      person can edit it and the old one now sees it read-only
- [x] Picked-up repairs can still be reassigned (cancelled ones are closed,
      ticket 51),
      so the history is right, but the customer's tracking page does not
      change
- [ ] Works on the live URL
