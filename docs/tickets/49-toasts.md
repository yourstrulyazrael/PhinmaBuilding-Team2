# 49 — Toast confirmations

**What to build:** "Saved", "Payment recorded", "Part added" and similar
confirmations appear as a small pop-up in the corner that fades away,
instead of a line of text under each form.

**Blocked by:** 48

**Status:** todo

- [ ] One toast component, same colours, with success and error styles
- [ ] Used by the forms that now show "Saved." text (Account, repair
      update, parts, staff, payments)
- [ ] Errors still also appear next to the field that needs fixing
- [ ] Screen readers announce each toast; it doesn't steal focus
- [ ] Works on the live URL, at phone width, in light and dark mode
