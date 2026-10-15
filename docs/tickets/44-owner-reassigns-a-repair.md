# 44 — Owner reassigns a repair

**What to build:** the owner moves a repair to another person in the
shop, for example when someone is off sick. This is the "Reassign to"
dropdown from the spec, left over from ticket 14.

**Blocked by:** 43

**Status:** todo

- [ ] On a repair's page, the owner sees "Reassign to", listing themself
      and every current staff member; removed staff are not listed
- [ ] Staff never see it, and the database refuses a reassignment from
      anyone but the owner, even sent directly
- [ ] The database refuses to hand a repair to someone outside the shop
      or to a removed staff member
- [ ] After reassigning, the repair shows the new "Handled by"; the new
      person can edit it and the old one now sees it read-only
- [ ] Finished repairs (picked up or cancelled) can still be reassigned,
      so the history is right, but the customer's tracking page does not
      change
- [ ] Works on the live URL
