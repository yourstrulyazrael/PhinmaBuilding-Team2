# 39 — Staff propose a revised estimate on a repair

**What to build:** staff who can't set revised estimates themselves can
propose one on the repair they're working on. The owner approves or
rejects it.

**Blocked by:** 38

**Status:** in progress (needs `supabase/sql/020-estimate-proposals.sql` run)

- [x] On an open repair they handle, staff without the permission see a
      **Revised estimate** line under "Update for the customer"; **Propose**
      opens the form in place: the new amount and why (10–500
      characters)
- [x] They then see it as waiting, or their last proposal approved or not
      approved with the owner's note, and can propose again
- [x] The owner sees a waiting proposal at the top of that same card (amount, current
      price, reason, who and when) with Approve / Reject and a note
- [x] Approving sets the revised estimate exactly as if the owner typed
      it: the customer is asked to accept it on the tracking page
- [x] Waiting proposals count on the bell and are listed in Notifications
      with a link to the repair
- [x] One waiting proposal per repair; only the database functions write
      proposals; staff read only their own, the owner only their shop's;
      a finished repair can't have its estimate changed
- [ ] Run 020; on the live URL, propose as staff, then approve and reject
      as the owner, and check the tracking page asks the customer
