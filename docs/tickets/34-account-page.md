# 34 — Account page (was My details)

**What to build:** one Account page, opened by clicking your avatar in
the top bar, where you edit everything about yourself and (owner) the
shop and its claim slip. The top bar marks the page you are on in blue.

**Blocked by:** 33

**Status:** in progress (needs `supabase/sql/016-shop-details-and-slip-note.sql` run)

- [x] /account: Your details (account name, contact number), Email,
      Password, for everyone
- [x] Owner only: Store details (shop name, address, shop phone) and
      Claim slip (a note of up to 500 characters at the bottom)
- [x] The claim slip (print and saved image) shows the address, the shop
      phone (or the owner's number if empty) and the note; the tracking
      page shows the address and calls the shop phone
- [x] Clicking the avatar opens Account; "My details" leaves the top bar
- [x] The page you are on is highlighted in blue in the top bar
      (including the avatar on Account)
- [x] /details and Workspace → Shop settings redirect to Account; the
      Shop settings tab is gone
- [x] Address, phone and note are owner-only to change (RLS from 006),
      readable by the shop; the public page only gets them through
      get_tracking_page
- [ ] Run 016 in Supabase, then check on the live URL and at phone width
