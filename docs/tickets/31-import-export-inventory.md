# 31 — Import and export the inventory

**What to build:** the owner downloads a template, fills it in, and
imports an existing inventory from a CSV, Excel or JSON file; and can
export the current inventory in the same three formats.

**Blocked by:** 30

**Status:** todo

- [ ] Templates to download as CSV, Excel (.xlsx) and JSON, with the
      columns sku, name, cost, retail_price, quantity, low_stock_at and
      two example rows
- [ ] Choosing a file shows a preview first: new parts, updated parts,
      unchanged parts, and rows with problems (row number and reason);
      nothing changes until Import is pressed
- [ ] A new SKU creates the part; its quantity is recorded as a restock
      ("Imported")
- [ ] An existing SKU updates name, prices and low-stock level, and a
      different quantity is recorded as an adjustment for the difference,
      so the stock history still adds up; archived parts come back
- [ ] Export the current inventory as CSV, Excel or JSON, in the same
      columns as the template, so an export can be imported again
- [ ] Import and export are owner only (exports include costs)
- [ ] Files are read in the browser; nothing is sent to an outside
      service
- [ ] Works on the live URL
