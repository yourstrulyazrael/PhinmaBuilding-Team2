# 51 — Confirm cancelling, smooth buttons, sort and delete parts

**What to build:** cancelling a repair asks first, gives instant feedback
and closes the repair for good; every button eases between states;
Inventory can be sorted and parts deleted (after "Are you sure?").

**Blocked by:** 48

**Status:** in progress (needs `supabase/sql/024-lock-cancelled-and-delete-parts.sql` run)

Cancelling
- [x] Picking Cancelled (repair page or Jobs list) or "Cancel the repair"
      (customer's request) opens "Cancel this repair?": Keep repairing /
      Yes, cancel repair
- [x] While it's open the page behind is dimmed and can't be clicked; in
      the customer-request box the two choices hide and come back on Keep
      repairing
- [x] Confirming shows "Cancelling…" at once, then goes to the dashboard,
      which says the repair was cancelled
- [x] A cancelled repair is read-only on its page and in the list; the
      database refuses any change to it or its parts

Buttons
- [x] Every button, link, menu item and field eases between states
      (off for reduced motion)

Inventory
- [x] Sort by clicking Part, Category, Cost, Retail or Stock (again to
      reverse), or with "Sort by"
- [x] Delete (bin icon) asks "Are you sure you want to delete this?";
      a part used on repairs can't be deleted: the box says how many and
      offers Archive instead
- [ ] Run 024; check all of the above on the live URL
