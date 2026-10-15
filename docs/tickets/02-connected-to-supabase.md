# 02 — Connected to Supabase, with sign-in

**What to build:** the technician can create an account, sign in, and
save their display name and contact number on the My details screen.
Their details are stored in Supabase and come back after a refresh.

**Blocked by:** 01

**Status:** done

- [x] The Supabase URL and publishable (anon) key are set on the laptop
      and in Vercel, and nothing else is exposed to the browser
- [x] The `technicians` table exists with Row Level Security on and
      policies so that each technician can only read, add and update
      their own row
- [x] The database change is saved as a numbered file in the repo
- [x] "Confirm email" is turned off in Supabase Auth
- [x] The technician can sign up, sign in and sign out with email and
      password
- [x] On My details, the display name and contact number save and are
      still there after a refresh
- [x] Signed out, the technician screens send you to Sign in
- [x] Works on the live URL
