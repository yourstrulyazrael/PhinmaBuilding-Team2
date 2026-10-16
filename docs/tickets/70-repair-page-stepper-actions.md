# 70 — Repair page: progress stepper, action bar, inline editing, copy buttons

**What to build:** a repair page where progress is visible at a glance,
the main actions are always within reach, small corrections don't need a
form, and the things people paste into messages copy in one click.

**Blocked by:** 67, 68

**Status:** done (check on the live URL)

- [x] Stepper in the Status card: Checked in → Diagnosing → Repairing →
      Ready for pickup → Picked up; "Waiting for parts" and "Warranty
      repair" show as a paused/marked repairing step; hidden when cancelled
- [x] Action bar slides up at the bottom once the Status card scrolls out
      of view: repair number (copy), Update status, Record payment, Copy
      tracking link; slides away when the card is back; toasts sit above it
- [x] Inline editing with a pencil: device, problem, customer name and
      contact no. (owner, as the database allows), estimated completion
      date (anyone who can change the repair); Enter saves, Esc cancels;
      toast with Undo, or Try again on failure
- [x] Copy buttons: repair number, contact no., tracking link (header and
      action bar), with a toast
- [ ] Works on the live URL, on a phone (bar fits) and a computer
