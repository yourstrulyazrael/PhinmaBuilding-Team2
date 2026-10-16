# 67 — Toasts, Undo and Try again

**What to build:** one toast system for confirmations, with **Undo** on
actions that can be reversed and **Try again** on ones that failed, plus
a recovery screen when a page fails to load. Replaces ticket 49.

**Blocked by:** 66

**Status:** done (check on the live URL)

- [x] `useToast()`: success, error, warning and info toasts in the bottom
      corner; max three; fade in and out; the timer pauses on hover or
      keyboard focus; screen readers announce them
- [x] Status change → "Status: Ready for pickup · Undo" (not for pickups
      or cancelling); a failed change → "Try again"
- [x] Payment recorded → toast
- [x] Part removed → "Undo" records it again; part added → toast
- [x] Reassigned → "Undo" hands it back
- [x] Photos: "Photo added"; a failed upload → "Try again", which carries
      on from the photo that failed
- [x] Repair details and Account forms: "Saved" as a toast; errors stay
      next to the form
- [x] Copy buttons toast what was copied, or "Try again" if blocked
- [x] The live customer pop-ups (ticket 52) use the same toasts
- [x] A page that fails to load shows "This page didn't load · Try again
      · Go to Overview" instead of a crash screen
- [ ] Works on the live URL, at phone width, light and dark
