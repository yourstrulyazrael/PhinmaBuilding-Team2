# 11 — Start a shop

**What to build:** a new account chooses "Start a shop" on a Set up
screen and becomes its owner. Our teammate's existing account becomes
the owner of a shop named after them, with all existing jobs moved in.
Jobs now belong to a shop, and the claim slip and tracking page show
the shop name.

**Blocked by:** 07

**Status:** done

- [x] The `shops` and `shop_members` tables exist with Row Level
      Security on and policies: members read their shop; only the owner
      renames it; nobody adds, changes or removes members directly
- [x] "Start a shop" is a database function that creates the shop and
      makes the caller its owner; a person already in a shop cannot
      start another
- [x] Jobs have `shop_id`, `handled_by` and `quoted_by`; every existing
      job is in its owner's shop, handled and quoted by the owner
- [x] The jobs security rules use shop membership instead of "my own
      jobs", and the tracking function returns the shop name
- [x] After signing up, a new account sees the Set up screen (name,
      contact, shop name) before anything else
- [x] The claim slip and tracking page show the shop name
- [x] Everything from phase 1 still works for the existing account
- [x] Signed out, nobody can read any shop, member or job; a second
      shop's account cannot see this shop's jobs
- [x] Works on the live URL
