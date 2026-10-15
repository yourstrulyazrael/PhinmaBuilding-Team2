# 10 — Workspace

**What to build:** a Workspace page where everything else the
technician needs is in one place, following the team's "Zenith Repair
Workspace" design reference. It is built entirely from the
technician's own jobs: no new tables. Added after the MVP.

**Blocked by:** 03

**Status:** done

- [ ] "Workspace" is in the sidebar and phone top bar, and the page has
      a "Repair desk" link back to the Jobs list
- [ ] Tabs: Customers, Notifications, Analytics, Shop settings. The tab
      is in the page address, so refresh keeps it
- [ ] **Customers**: one entry per customer phone number, with their
      latest name, how many repairs, how many are still open, and a link
      to each repair
- [ ] **Notifications**: jobs that are overdue, ready but not collected,
      waiting for parts for more than 3 days, or have a revised estimate
      above the quote. Each links to the job. Nothing is sent to
      customers
- [ ] **Analytics**: jobs received and picked up this month (Manila
      time), open jobs, value of open jobs, average days from drop-off to
      pickup, jobs by status, most common devices
- [ ] **Shop settings**: the My details form, so the name and contact on
      slips can be changed here
- [ ] **Overdue & awaiting pickup** panel below the tabs, each row
      linking to the job
- [ ] Only the signed-in technician's jobs are ever used (RLS)
- [ ] Works at phone width
- [ ] Works on the live URL

Not in this ticket (see `docs/LATER.md`): Inventory, Technicians.
