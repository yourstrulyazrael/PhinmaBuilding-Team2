# Later

The local-browser prototype demonstrates intake, estimate approval,
payments, inventory, warranty, activity history, notifications, customer
profiles, alerts, analytics, technician assignments, and shop settings.
These workflows are not production services yet; see [README](../README.md)
and [the problem brief](./PROBLEM.md) for local-preview limitations.

Potential next steps:

- **Shared backend and synchronization**: persist jobs and workspace data
  securely so the technician and customer can use separate devices.
- **Automated notifications**: connect an approved email, SMS, or messaging
  provider rather than requiring manual copying.
- **Staff accounts and permissions**: make technician assignments actionable
  and record authenticated users in activity logs.
- **Payment integrations and accounting reports**: connect a payment provider
  and produce reconciled business reports.
- **Customer accounts and ratings**: let customers authenticate and review
  repair history.
- **Built-in printer support**: print directly to receipt or thermal
  printers; the current prototype uses the device's print dialog.

## Parked from the dashboard design reference (ticket 03)

The landing page follows the reference design, minus these pieces:

- **Workspace tools** links: customers, inventory, team, reports, shop
  settings.
- **Notification bell** and **workspace switcher** in the top bar.
- **Search box** and **sort menu** on the Repair jobs list (useful once a
  technician has dozens of jobs, not 3–5).
- **"Preview workspace" banner**: not needed, jobs are saved in Supabase.
- **"Need a hand?"** help box in the sidebar.

## Parked from ticket 05

- **Instant tracking-page updates (Supabase Realtime)**: today the
  tracking page re-checks every 15 seconds. Instant updates need a
  broadcast trigger and Realtime security policies, because customers
  have no account and RLS blocks them from the jobs table.
