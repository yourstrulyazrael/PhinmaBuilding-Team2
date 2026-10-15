# 46 — The owner resets a staff member's password

**What to build:** when a staff member forgets their password, the owner
gives them a new temporary one. Passwords still can't be viewed by
anyone.

**Blocked by:** 43

**Status:** in progress (needs `supabase/sql/022-owner-resets-staff-password.sql` run)

- [x] Each staff card has **Reset password**: the owner types a new
      temporary password (8–72 characters, shown as they type so they
      can read it out) and confirms
- [x] The old password stops working and the staff member is signed out
      on every device; they sign in with the new one and change it on
      Account
- [x] Only the owner, only for current staff of their own shop; never
      the owner's own password, a removed person, or another shop's
      staff, even if called directly
- [x] Stored scrambled the way Supabase does; no `service_role` key
- [x] The Staff tab says passwords can't be shown and points to Reset
      password
- [ ] Run 022; on the live URL reset a test staff password, check the
      old one fails and the new one works, and that a signed-in session
      for that account is ended
