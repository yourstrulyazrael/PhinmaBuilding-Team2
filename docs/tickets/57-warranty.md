# 57 — Warranty on picked-up repairs

**What to build:** every repair has a warranty from the day it's picked
up, shown to the shop and the customer, and a repair that comes back can
be marked "Back under warranty".

**Blocked by:** 44 (warranty settings in 027)

**Status:** in progress (needs `supabase/sql/027-reassign-hours-warranty.sql` run)

- [x] Account → Store details → Warranty (days): 30 by default, 0 for none
- [x] Claim slip (and its image): "Warranty: 30 days from pickup", then
      "Until Nov 14" once picked up
- [x] Repair page: "Warranty: 30 days, until Nov 14" (or "Ended …")
- [x] Tracking page: "Warranty: Until Nov 14" once picked up
- [x] New status **Back under warranty**: offered only for picked-up
      repairs; the database refuses it after the warranty ended or if the
      shop gives none. Its estimated completion date moves to today if it
      had passed, so it isn't shown as late straight away
- [x] Handing it back (Picked up again) doesn't ask for payment; the first
      payment is kept and still counts in Reports on its original day
- [x] Tracking page: "Your phone is back with us under its warranty"
- [ ] Run 027; on the live URL mark a picked-up repair Back under
      warranty, check slip, tracking page and Reports, then hand it back
