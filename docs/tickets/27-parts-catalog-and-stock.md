# 27 — Parts catalog and stock

**What to build:** the owner keeps a catalog of parts (SKU, name, cost,
low-stock level) and records restocks and adjustments. Everyone in the
shop sees what's in stock; low stock is flagged.

**Blocked by:** 11

**Status:** done

- [ ] An Inventory page in the top bar, for owner and staff
- [ ] The owner adds a part: SKU (unique in the shop), name, cost,
      starting stock, and a low-stock level; and can edit or archive it
- [ ] The owner records a restock (+) or an adjustment (+ or −) with an
      optional note
- [ ] Stock only changes through these movements (and parts used,
      ticket 28): the quantity can't be edited directly, even with a
      hand-made request
- [ ] Every movement is kept in a history (who, when, what, why) that
      nobody can edit or delete
- [ ] Parts at or below their low-stock level show amber; below zero
      show red as "Check count"; low stock appears in Notifications and
      at the top of Inventory
- [ ] Cost is visible to the owner only: staff can't read it, even with a
      hand-made request
- [ ] Staff can't add, edit or restock parts
- [ ] Works on the live URL
