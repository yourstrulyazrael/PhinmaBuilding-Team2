# 37 — Edit and remove staff; staff ask to revise estimates

**What to build:** the owner can fix a staff member's details and remove
them from the shop. The "Can revise estimates" switch is replaced by a
request: staff ask with a reason, and the owner approves or rejects it.

**Blocked by:** 36

**Status:** in progress (needs `supabase/sql/019-manage-staff-and-estimate-requests.sql` run)

- [x] Staff card: **Edit** (name and contact number) and **Remove** (with a
      confirm step that says how many open repairs move to the owner)
- [x] Removing keeps the login and the name on past repairs, but the
      person loses all access at once (every RLS rule asks `my_shop_id`,
      which now skips removed people); their open repairs move to the
      owner; a removed person who signs in is told they were removed
- [x] Staff email and password stay theirs to change on Account (the
      owner can't, without the `service_role` key)
- [x] Account → Revised estimates (staff): send a request with a reason
      (10–500 characters); see it waiting, approved, or rejected with the
      owner's note; ask again after a rejection or a take-back
- [x] Staff tab: waiting requests at the top, a count on the tab; Approve
      (grants the permission) or Reject, with an optional note; **Take
      back** on anyone who has it
- [x] A repair's page tells staff without permission where to ask
- [x] One waiting request per person; only the database functions write
      requests; staff read only their own, the owner only their shop's
- [ ] Run 019; on the live URL, request as staff, approve and reject as
      the owner, edit and remove a test staff account, and sign in as the
      removed account
