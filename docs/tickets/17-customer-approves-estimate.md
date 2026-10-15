# 17 — Customer approves the revised estimate

**What to build:** when the owner sets or changes a revised estimate,
the customer's tracking page asks them to Approve or Decline it. The
shop sees the answer on the job, so nobody works on an unapproved price.

**Blocked by:** None

**Status:** done

- [ ] Setting or changing a revised estimate shows "Waiting for the
      customer" on Job detail
- [ ] The tracking page shows the new estimate next to the initial quote,
      with Approve and Decline buttons, while it is waiting
- [ ] After answering, the tracking page and Job detail show "Approved"
      or "Declined" (Job detail updates on refresh)
- [ ] A declined estimate appears in Workspace → Notifications
- [ ] Only the customer (someone with the tracking link) can answer; a
      shop account cannot set the answer, even with a hand-made request
- [ ] Older jobs whose revised estimate was agreed before this ticket are
      not asked again
- [ ] Works on the live URL
