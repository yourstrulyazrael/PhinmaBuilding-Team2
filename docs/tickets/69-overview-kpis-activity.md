# 69 — Overview: clickable cards, KPI trends, activity feed, quick actions

**What to build:** an Overview that shows how the week is going and what
just happened, and gets you to the common jobs in one click.

**Blocked by:** 66. **Needs:** `supabase/sql/031-job-events.sql` run once.

**Status:** done (check on the live URL after running 031)

- [x] Open repairs / Waiting on parts / Ready for pickup cards are links
      to the matching list (All jobs, Waiting on parts, Ready); they lift
      on hover and say "View"
- [x] KPI strip, last 7 days vs the 7 before, with ▲▼ and a small line:
      Completed repairs, Revenue (owner) or Phones checked in (staff),
      Average turnaround (a drop shows green: faster is better)
- [x] Recent activity: the last 8 things that happened in the shop
      (checked in, status changes, payments, reassignments, customer
      answers), who did it, and when; each opens the repair
- [x] The history is written by the database itself (trigger on jobs),
      readable by the shop's members only, and nobody can edit it
- [x] Existing repairs are back-filled ("checked in", "picked up")
- [x] Without 031 the panel says to run it; nothing else breaks
- [x] Quick actions in the header: Find a customer, Record a payment
      (opens Ready for pickup), New repair
- [ ] Works on the live URL; activity appears after a status change
