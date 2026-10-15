# 12 — Apprentices join with an invite code

**What to build:** the owner shares the shop's invite code; an
apprentice signs up, types the code on the Set up screen and joins the
shop. Apprentices see all the shop's jobs and can add jobs, but can only
change their own jobs, and never the prices. The limits ship in this
same ticket, so apprentices never have more access than they should.

**Blocked by:** 11

**Status:** todo

- [ ] The `shop_invites` table exists with Row Level Security on: only
      the owner can read the code; nobody else, ever
- [ ] The owner sees the invite code in Shop settings, with a "Make a
      new code" button; the old code stops working straight away
- [ ] "Join a shop" is a database function: a correct code makes the
      caller an apprentice; a wrong code is refused; a person already in
      a shop cannot join another
- [ ] Apprentices see every job in the shop, and new jobs they add are
      handled and quoted by them
- [ ] The database refuses an apprentice changing a job they do not
      handle, or changing the quote, revised estimate, `handled_by`,
      `quoted_by` or `shop_id`, even with a hand-made request
- [ ] Apprentices can change status, notes, parts replaced and promised
      date on their own jobs, and the tracking page still updates
      instantly
- [ ] Apprentices can read their shopmates' names, but not another
      shop's anything
- [ ] Works on the live URL
