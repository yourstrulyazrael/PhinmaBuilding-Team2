# 68 — Breadcrumbs, keyboard shortcuts and a command palette

**What to build:** faster ways to move around: a breadcrumb trail on every
page, a Ctrl/⌘+K palette to find any repair or page, and single-key
shortcuts.

**Blocked by:** 66

**Status:** done (check on the live URL)

- [x] One repair number everywhere: `ZR-` + 8 characters (repair page,
      receipt, breadcrumbs, search)
- [x] Breadcrumbs: Overview › Repairs › Repair ZR-3F9A1C2B (and New
      repair, Inventory, Workspace, Reviews, Reports, Account,
      Notifications); every crumb but the last is a link
- [x] The Overview search also finds repairs by ZR- number
- [x] Ctrl+K / ⌘K (or the search button in the top bar) opens the
      palette: repair search by device, customer, contact no. or number;
      actions (New repair, Find a customer, Record a payment); every page
- [x] Palette keyboard: ↑ ↓ Enter Esc; focus returns where it was
- [x] Shortcuts when not typing: `/` search, `N` new repair, `?` list of
      shortcuts; Alt+1…6 still go to the top-bar pages
- [x] Repair search runs on the server under RLS: only your shop's repairs
- [ ] Works on the live URL; Ctrl+K on Windows, ⌘K on a Mac
