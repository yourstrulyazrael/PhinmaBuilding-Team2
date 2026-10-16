# 83 — Lead Technician role

**What to build:** a third role between Owner (admin) and Staff. Leads
run the floor: any repair, approve staff's quotes, reassign, add Staff.
Only the owner adds Leads.

**Blocked by:** 37, 39, 44, 74. **Needs:** `supabase/sql/032-lead-technician.sql`.

**Status:** done (run 032, then check on the live URL)

- [x] Database: 'lead' role; `i_lead_my_shop()`; every rule below enforced
      there (repairs, parts, photos, proposals, requests, reassigning,
      adding people), not just hidden in the app
- [x] Leads work on any repair and can correct device/customer details
- [x] Leads set revised quotes directly, and approve or reject staff's
      proposals and quote-permission requests (and see them in
      Notifications and live pop-ups)
- [x] Leads reassign repairs, one at a time or in bulk
- [x] Leads see Workspace › Staff and can **Add staff** (Staff only)
- [x] Only the owner: the "Role: Staff / Lead technician" choice when
      adding, and ⋮ › Make lead / Make staff (with Undo)
- [x] Only the owner: edit, reset password, remove (now for leads too),
      reports, store settings, inventory catalog, everyone's ratings
- [x] "Lead technician" chip on staff cards; Account shows the role
- [x] Staff-facing wording no longer assumes the owner answered ("Send for
      approval", "Your quote was approved", "Their note")
- [ ] Run 032; add a lead; sign in as them and approve a staff proposal
