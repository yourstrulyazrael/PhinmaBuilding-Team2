# 76 — Optimistic UI updates

**What to build:** safe actions show their result immediately, then the
server confirms; if it refuses, the screen snaps back and says why.

**Blocked by:** 67

**Status:** done (check on the live URL)

Already optimistic before this ticket: status changes (StatusPicker),
inline edits (ticket 70), the Overview search and tabs.

- [x] Parts used: an added part appears at once (faded until saved); a
      removed part disappears at once; the parts total follows
- [x] Photos: a deleted photo disappears at once
- [x] Staff requests: Approve / Reject shows the answer at once (ticket 74)
- [x] On failure: the item comes back, the error shows, and the toast
      offers Try again
- [x] Not optimistic on purpose: payments, cancelling, removing staff,
      password resets (they need the server's "yes" first)
- [ ] Works on the live URL, also on a slow connection
