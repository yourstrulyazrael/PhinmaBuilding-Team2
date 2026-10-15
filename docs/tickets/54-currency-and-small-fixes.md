# 54 — Shop currency, and three small fixes

**What to build:** the owner picks the shop's currency; plus a saved ✓ on
staff edits, plain-text contact details in Workspace, and correct
"customer/customers" in the Overview reminder.

**Blocked by:** 53

**Status:** in progress (needs `supabase/sql/026-shop-currency.sql` run)

Currency
- [x] Account → Store details → Currency (18 common currencies; peso by
      default). Amounts are not converted, only shown in the new currency
- [x] Every amount and money label follows it: repair page, slip and its
      image, Messenger messages, notifications, Inventory (and its Excel
      export), Reports & analytics (and its Excel), charts, payments, and
      the customer's tracking page
- [x] Pages drawn on the server use the request's shop currency (kept per
      request, so shops never mix); browser parts get it from the layout
- [x] Imports accept any currency sign or code in money columns

Small fixes
- [x] Right after Save on a staff member's details (or a password reset), a
      green ✓ "Details saved" ("Password reset.") shows, then Close
- [x] Reports & analytics logo follows light/dark (prints stay green);
      the customer name has a placeholder
- [x] Workspace emails and numbers are plain text (no "which app?"
      prompt); they can be selected and copied
- [x] Overview reminder: "Let the customer know." for one person,
      "customers" for more (two repairs for one person count once)
- [ ] Run 026; on the live URL switch to another currency and back, and
      check a repair, a slip, a tracking page and Reports
