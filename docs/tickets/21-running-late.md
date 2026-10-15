# 21 — Running late: warn the shop, tell the customer

**What to build:** when a repair is not ready by its promised date, the
shop is warned (with a heads-up the day before), and the customer's
tracking page apologises and shows the original date. The shop can copy
a ready-made delay message for Messenger. No automatic SMS or email:
those need a paid service.

**Blocked by:** None

**Status:** todo

- [ ] Notifications shows "Due today" and "Due tomorrow" for repairs not
      yet ready, as well as late ones
- [ ] The Overview shows a warning when any repair is late or due today,
      linking to Notifications
- [ ] A late job's detail page shows a warning with "Copy delay message"
- [ ] The delay message apologises, names the device, the original date
      and current status, includes the tracking link, and never the
      customer's name or phone
- [ ] The tracking page shows a "running late" apology with the original
      promised date while the repair is late
- [ ] Setting a new promised date, or Ready for pickup, removes the
      warnings and the apology
- [ ] Works on the live URL
