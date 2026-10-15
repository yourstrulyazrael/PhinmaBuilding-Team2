# 03 — Add and list repair jobs

**What to build:** the technician adds a repair job (customer name,
customer phone, device, problem, initial quote, promised date) and sees
all their ongoing repair jobs in one list.

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
- [ ] Works on the live URL
