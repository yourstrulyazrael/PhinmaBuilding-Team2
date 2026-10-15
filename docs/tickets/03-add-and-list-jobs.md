# 03 — Add and list repair jobs

**What to build:** the technician adds a repair job (customer name,
customer phone, device, problem, initial quote, promised date) and sees
all their ongoing repair jobs in one list.

The signed-in landing page follows the team's dashboard design
reference: forest green (primary), white (secondary) and navy blue
(tertiary). Parked extras are listed in LATER.md.

**Blocked by:** 02

**Status:** todo

- [ ] The `jobs` table exists with the columns in the spec, Row Level
      Security on, and policies so that a technician can only read, add
      and update their own jobs
- [ ] Status can only be one of the six statuses, and a new job starts
      at Received
- [ ] The initial quote cannot be negative
- [ ] The database change is saved as a numbered file in the repo
- [ ] The New job form saves a job and refuses empty required fields
      with a clear message
- [ ] The Jobs list is the technician's home screen and shows device,
      customer name, status and promised date, soonest promised date
      first
- [ ] Picked-up jobs sit in a collapsed "Done" section at the bottom
- [ ] The app uses forest green, white and navy blue throughout
- [ ] Laptop and tablet show a sidebar; a phone shows a compact top bar
- [ ] The landing page greets the technician by name and has an "Add a
      repair" button
- [ ] Three count cards show Open repairs, Waiting on parts and Ready
      for pickup, counted from real jobs
- [ ] Repair jobs shows as a table on laptop and as cards on a phone,
      with All / Ready / Waiting on parts tabs
- [ ] Works on the live URL
