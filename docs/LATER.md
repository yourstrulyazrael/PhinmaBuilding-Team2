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

- **Workspace tools**: customers, notifications, analytics and shop
  settings were built in ticket 10. Still parked:
  - **Inventory** (parts in stock): needs a new table with RLS and its
    own add/edit forms, so it gets its own ticket.
  - **Technicians / team**: staff accounts break the spec's "one
    independent technician working alone".
- **Notification bell** and **workspace switcher** in the top bar.
- **"Preview workspace" banner**: not needed, jobs are saved in Supabase.
- **"Need a hand?"** help box in the sidebar.
