# 28 — Record parts used on a repair

**What to build:** on Job detail, the person handling the job (or the
owner) records which parts were used, and how many. Stock goes down
automatically, and the customer sees the parts by name.

**Blocked by:** 27

**Status:** done

- [ ] Job detail has a "Parts used" section: pick a part and quantity,
      Add; each line can be removed (stock goes back)
- [ ] Adding deducts stock and records a "used" movement linked to the
      job; removing records a "returned" movement
- [ ] Using a part with no stock is allowed; it goes below zero and shows
      "Check count"
- [ ] Only the owner or the job's handler can add or remove parts on a
      job, even with a hand-made request
- [ ] The tracking page lists the parts by name under "Parts replaced"
      (never cost or SKU)
- [ ] Works on the live URL
