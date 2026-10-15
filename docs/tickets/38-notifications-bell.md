# 38 — Notifications move to a bell in the top bar

**What to build:** Notifications leave the Workspace and become a bell in
the top bar, beside the account, with a count of what needs you.

**Blocked by:** 37

**Status:** done (check on the live URL)

- [x] A bell between the theme switch and the account, on every page,
      for the owner and staff; blue when you are on Notifications
- [x] A red badge with the count: reminders on open repairs, low stock
      (counted once), and for the owner, waiting requests to revise
      estimates; no badge when there is nothing
- [x] The bell opens /notifications: the same reminders as before, plus a
      link to the waiting requests (owner)
- [x] The count and the page come from one shared loader that only reads
      open repairs, so the bell stays cheap on every page
- [x] The Workspace Notifications tab is gone; old links and the
      Overview's "late" banner go to /notifications
- [x] On a narrow phone the page icons scroll sideways so the bell,
      account and sign out stay on screen
- [ ] Works on the live URL and at phone width
