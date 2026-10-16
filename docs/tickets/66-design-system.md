# 66 — Design system, background, icons, focus and reduced motion

**What to build:** one written set of rules for spacing, type, radius,
shadow, sizes and icons, applied app-wide, plus a subtle background,
clear keyboard focus and full reduced-motion support.

**Blocked by:** 48

**Status:** done (check on the live URL)

- [x] `docs/DESIGN.md` lists the colour tokens, spacing, type, radius,
      shadow, size, icon and motion rules
- [x] A second radius token (`rounded-inner`) used for rows inside menus
- [x] A faint dot grid behind every page, fading downwards; not printed
- [x] Every icon has the same line weight and never squashes
- [x] Every focusable element shows a green ring when reached by keyboard
      (never after a mouse click); buttons get an outline plus glow
- [x] "Reduce motion" on the device stops every animation and transition
- [ ] Works on the live URL, light and dark, with Tab navigation
