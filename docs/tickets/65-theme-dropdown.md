# 65 — Theme switcher as a dropdown, with smooth transitions

**What to build:** the theme button opens a small menu instead of
cycling, and both the menu and the theme change move smoothly.

**Blocked by:** 59

**Status:** done (check on the live URL)

- [x] The theme button opens a dropdown: Light, Dark, System, each with
      its icon; a ✓ on the current choice
- [x] The dropdown drops in when it opens and fades out when it closes;
      keyboard works (↑ ↓ Enter Esc), starting on the current choice
- [x] Choosing a theme cross-fades the whole page from the old colours to
      the new over 0.4 s (the browser's view transition)
- [x] Instant instead for "reduce motion", or in browsers without view
      transitions
- [x] The other dropdowns (Inventory Export) also fade out on close
- [ ] Works on the live URL, on a phone and a computer
