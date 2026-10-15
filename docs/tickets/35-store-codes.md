# 35 — Store codes: nobody signs up on their own

**What to build:** nobody can create an account by themselves. The
developer gives each store owner a one-time **store code**; with it the
owner sets up their account and then names their shop. Staff are still
created by their owner. Stores stay in one Supabase project, kept apart
by RLS.

**Blocked by:** 34

**Status:** in progress (needs `supabase/sql/017-store-codes.sql` run)

- [x] The developer makes a code in the SQL Editor:
      `select new_store_code('who it is for');` (12 characters, shown as
      XXXX-XXXX-XXXX); `select * from store_codes;` lists who used which
- [x] Login: "Create an account" becomes "Have a store code? Set up your
      store", which asks for the code, email and password
- [x] A code works once, and lets that one account start one shop (the
      owner names it on the setup page, as before)
- [x] Owner's Add staff still works: it gets a one-time staff ticket
      (10 minutes, that shop only) and sends it with the sign-up; add_staff
      only accepts accounts made with this shop's ticket
- [x] The database refuses every other sign-up, even straight to the
      Supabase API; the app and RLS can't read or change codes or tickets
- [x] Existing accounts and shops keep working
- [ ] Run 017, make a code, set up a test store with it on the live URL;
      check a reused or made-up code is refused and Add staff still works
