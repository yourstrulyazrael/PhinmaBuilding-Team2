# 42 — Show the owner's answers to staff, and the customer's decline reason to the shop

**What to build:** what the owner wrote when answering a staff member,
and what the customer wrote when declining, are easy to find and read.

**Blocked by:** 41

**Status:** done (check on the live URL; the decline reason needs 021)

Owner → staff
- [x] When the owner approves or rejects a staff member's proposed
      estimate, or their request to revise estimates, that staff member
      gets a notification (counted by the bell) for two days: the answer
      and the owner's note in full, or "No note from the owner"
- [x] On the repair, the staff member who proposed sees a green
      (approved) or red (rejected) box at the top of "Update for the
      customer" with the amount, when, and the owner's note; it stays
      even after the repair is finished
- [x] Account → Revised estimates still shows the note on their request

Customer → shop
- [x] When the customer declines, everyone in the shop sees a red box at
      the top of "Update for the customer": the amount, when, and their
      reason in their words (or "No reason given" for older answers)
- [x] The declined notification includes the reason (ticket 41)
- [x] No database change (uses 019–021)
