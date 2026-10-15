# 23 — Staff can revise estimates, if the owner allows

**What to build:** the owner can allow individual staff members to set
or change the revised estimate on the jobs they handle. Staff without
permission still cannot. The customer still approves every new estimate
(ticket 17).

**Blocked by:** 22

**Status:** done

- [ ] Each staff member in Shop settings → Staff has a "Can revise
      estimates" switch, off by default, that only the owner sees
- [ ] Permitted staff see the revised estimate box on Job detail for the
      jobs they handle, and can save it
- [ ] Staff without permission do not see the box, and the database
      refuses them even with a hand-made request
- [ ] Only the owner can change the permission: staff cannot give it to
      themselves, even with a hand-made request
- [ ] A changed estimate still goes to the customer for approval
- [ ] Works on the live URL
