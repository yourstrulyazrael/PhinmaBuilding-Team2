# 78 — Active navigation states

**What to build:** you can always see where you are.

**Blocked by:** 59

**Status:** done (check on the live URL)

- [x] One rule for "which section is this page in" (`lib/nav.ts`): a
      repair, its claim slip and receipt light up **Overview**; New repair
      lights up **Add a repair**; inner pages light up their section
- [x] Top bar (laptop) and tab bar (phone) both use it; "More" lights up
      on Reviews, Reports, Notifications and Account
- [x] Sub-sections already highlight their current choice: Overview tabs,
      Workspace tabs, Notifications tabs, breadcrumbs (current crumb bold)
- [ ] Works on the live URL: open a repair and check Overview is lit
