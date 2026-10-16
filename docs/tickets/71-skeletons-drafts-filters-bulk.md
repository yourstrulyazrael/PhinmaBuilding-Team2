# 71 — Skeletons, autosaved drafts, remembered filters, bulk actions

**What to build:** no blank waits, no lost typing, the list opens the way
you left it, and many repairs can be changed at once.

**Blocked by:** 67, 69

**Status:** done (check on the live URL)

- [x] Each page shows a skeleton in its own shape while it loads
      (Overview, repair, New repair, Inventory, Workspace, Reviews,
      Notifications, Reports, Account); still with "reduce motion"
- [x] New repair autosaves as you type (this browser only); reopening
      shows "your draft is back · Discard draft"; Discard has Undo; the
      draft is removed once the repair saves, and kept if saving fails
      (the form is refilled instead of going blank)
- [x] Overview remembers tab, sort and staff filter (a cookie with only
      those three); "/" from the top bar opens that view; a filter in the
      address always wins; the search is never remembered
- [x] Tick boxes on open repairs you may change, plus Select all; a bar
      appears: "N selected · Change status · Reassign (owner) · ✕"
- [x] Bulk status change (not Picked up, Cancelled or warranty: those are
      one at a time) and bulk reassign; toast with Undo, which puts each
      repair back to its own previous status / technician
- [ ] Works on the live URL, at phone width
