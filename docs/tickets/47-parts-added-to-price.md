# 47 — Parts are charged on top of the labour quote

**What to build:** the quote (and any revised estimate) is labour. Parts
used on a repair are added on top, at their retail price, and the
customer sees an itemised price.

**Blocked by:** 43

**Status:** in progress (needs `supabase/sql/023-parts-added-to-price.sql` run)

- [x] Each repair keeps a parts total, updated by the database whenever
      a part is added or removed; nobody can type it in
- [x] Total = labour (revised estimate, else quote) + parts. The pickup
      amount, open-repairs value and Overview use the total
- [x] Repair page: labour quote, revised labour, parts, and the total
- [x] New repair, revised estimate and proposals say "labour"; proposals
      compare labour with labour
- [x] Tracking page: labour, each part with its price, and the total
      (never the shop's cost); the approve box shows the new total
- [x] Claim slip and its image: labour quote, then parts ("added on top
      when used", or the amount and total so far)
- [x] Copy update message: labour, parts and total
- [x] Reports table and Excel: a Parts column
- [ ] Run 023, then check every OPEN repair that already has parts: its
      quote used to include them, so its total will now be higher. Lower
      the quote with a revised estimate where needed
- [ ] On the live URL: add a part and see the total, the tracking page
      and the pickup amount all go up by its price
