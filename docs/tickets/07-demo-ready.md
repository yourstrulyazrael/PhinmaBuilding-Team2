# 07 — Demo-ready

**What to build:** the three-minute demo runs smoothly on the live URL,
the privacy rules are proven, and the app has been used for real.

**Blocked by:** 05, 06

**Status:** todo

- [ ] The demo runs start to finish: add a job, a QR appears, someone
      scans it on their own phone and sees "Received", the technician
      taps "Ready for pickup", and within 15 seconds the scanner's page
      changes by itself
- [ ] Signed out, nobody can see any jobs or technician details
- [ ] A second technician account cannot see the first account's jobs
- [ ] Row Level Security is on for both tables, checked in the Supabase
      dashboard
- [ ] No `service_role` or `sb_secret_` key appears anywhere in the
      project, and `.env.local` is not committed
- [ ] Our technician teammate has logged real repair jobs
- [ ] We asked at least one technician outside the team to try it
- [ ] Every item in the spec's "Done for the demo" list is ticked
- [ ] Works on the live URL
