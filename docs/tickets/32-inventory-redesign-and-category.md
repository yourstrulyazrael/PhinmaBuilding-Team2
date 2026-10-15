# 32 — Inventory redesign, and part categories

**What to build:** Inventory follows the team's reference design, and
parts get a category.

**Blocked by:** 31

**Status:** todo

- [ ] Breadcrumb, title and subtitle; Import parts, Export (CSV / Excel /
      JSON) and Add part buttons in the header (owner); Import and Add
      open in a dialog
- [ ] Three stat cards: Total parts, Units in stock, Running low (tapping
      it filters the table)
- [ ] "All parts" table: part (icon, name, SKU), category, cost (owner),
      retail, stock pill, and a ⋮ menu (Restock, Adjust, Edit) plus
      Archive; search by name, category or SKU; 50 rows at a time with
      Show more; archived parts behind a toggle
- [ ] Parts have an optional category (up to 50 characters), suggested
      from existing ones when adding or editing, and included in
      templates, import and export
- [ ] Most used parts and Stock history stay below the table
- [ ] Works at phone width and on the live URL
