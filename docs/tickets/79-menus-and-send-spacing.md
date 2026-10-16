# 79 — Fix: dropdowns that didn't open, "Send to owner" overlap

**Reported:** (1) "Send to owner" ran into the parts' Add button; (2) the
status dropdown in the repair page's bottom bar did nothing; (3) "More"
in the phone tab bar did nothing.

**Cause:** (2) and (3): those bars use a blur effect, and the browser
positions "fixed" things inside a blurred box relative to that box, so the
dropdowns opened off the screen. (1): the revised-quote form, Parts used
and the Send button had lost their spacing in the ticket 72 redesign.

**Status:** done (check on the live URL)

- [x] Dropdown menus, the status menu and the Ctrl+K palette are drawn
      directly on the page body (a portal), so no parent can hide them
- [x] Repair page bottom bar: the status dropdown opens upward on screen
- [x] Phone tab bar: More opens its list (Reviews, Reports, Notifications,
      Account, Search)
- [x] Revised quote, Parts used and "Send to owner" are spaced apart; Send
      sits on its own row under a line, with "Sends the revised quote above"
- [ ] Checked on the live URL, phone and laptop
