# 64 — Before-and-after photos of each device

**What to build:** the shop photographs the device as it comes in and as
it goes out, on the repair's page. This moves intake photos into scope.

**Blocked by:** 63

**Status:** in progress (needs `supabase/sql/030-job-photos.sql` run)

- [x] A "Before & after photos" card on every repair: up to 4 before and
      4 after; tap one to see it full size
- [x] "Add photo" takes a photo or picks from the library (phone or
      computer); several at once; shrunk to ~1600 px JPEG (~300 KB) before
      uploading, the right way up
- [x] Delete with "Delete this photo? Yes / No"
- [x] Stored in a private Supabase Storage bucket, one folder per repair;
      shown through links that last an hour
- [x] Only the shop's own members can see them; only the owner or the
      person handling the repair can add or delete; nothing on a cancelled
      repair; customers and other shops get nothing
- [x] Images only (JPEG, PNG, WebP), up to 5 MB each
- [ ] Run 030; on the live URL add photos from a phone, view, delete, and
      check a staff member not handling the repair sees them read-only
