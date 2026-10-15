# 36 — The owner sees staff details

**What to build:** in Workspace → Staff, the owner sees each person's
sign-in details, not just their name and number.

**Blocked by:** 35

**Status:** in progress (needs `supabase/sql/018-staff-accounts.sql` run)

- [x] A card per person: name, role, sign-in email (tap to email),
      contact number (tap to call), joined date, last sign-in, and their
      repairs (open and total); the "Can revise estimates" switch stays
- [x] Emails and sign-ins come from `shop_staff_accounts()`: owner only,
      own shop only; staff and other shops get nothing
- [x] Passwords are shown as hidden, with the reason: Supabase stores
      only a scrambled version (a hash), so nobody can read one. Staff
      change theirs on Account
- [ ] Run 018; check on the live URL as the owner, and that a staff
      account cannot open the Staff tab
