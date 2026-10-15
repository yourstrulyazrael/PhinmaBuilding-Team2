# 62 — Customers review the technician

**What to build:** after picking up their phone, the customer can rate
the technician who handled the repair. This moves ratings into scope
(customers still need no account).

**Blocked by:** 58

**Status:** in progress (needs `supabase/sql/028-reviews.sql` run)

Customer (tracking page)
- [x] Once picked up: "How did <technician> do?", 1–5 tappable stars
      (arrow keys too) with a word (Poor … Excellent), an optional comment
      (up to 500 characters) and Send review
- [x] One review per repair; afterwards "Thank you for your review!" and
      "You rated <technician> ★★★★☆"

Shop
- [x] The repair page shows the review (stars, date, comment)
- [x] Account → Your reviews: average, count, the 10 newest with device
- [x] Workspace → Staff: each person's average and number of reviews
- [x] A notification (and bell count) for new reviews, for two days
- [x] Private: each technician sees reviews of their own work, the owner
      sees everyone's; only the customer's function can add one; nobody
      can edit or delete one
- [ ] Run 028; on the live URL pick up a test repair, review it from the
      tracking page, and check the repair page, Account, Staff and the bell
