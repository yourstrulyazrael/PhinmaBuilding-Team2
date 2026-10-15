# 22 — The owner creates staff accounts

**What to build:** the owner adds a staff member whenever they like, by
filling in their name, contact number, email and a temporary password
in Shop settings. The account is created already inside the shop, and
the owner hands over the login. Staff can change their password. The
invite code from ticket 12 is removed.

**Blocked by:** 12

**Status:** done

- [ ] Shop settings (owner only) has "Add staff": name, contact number,
      email, temporary password (at least 8 characters)
- [ ] Saving creates the account and adds it to the shop as staff
      (apprentice), without signing the owner out
- [ ] An email that already has an account is refused with a clear
      message
- [ ] Shop settings shows a Staff list (name, contact, role)
- [ ] Everyone can change their own password
- [ ] The new staff member signs in and lands straight on the shop's
      Jobs list, with the same limits as in ticket 12
- [ ] Only the owner can add staff, and only a brand-new account (made
      in the last 10 minutes, not in any shop) can be added: nobody can
      pull an existing account into their shop
- [ ] The invite code, "Join a shop" and their database parts are gone
- [ ] No `service_role` key is used: the database rules do the work
- [ ] Works on the live URL
