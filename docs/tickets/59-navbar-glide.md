# 59 — The navbar highlight glides

**What to build:** the outline on the current page's navbar button glides
to the next one, like the Today · 7 days · 30 days pill.

**Blocked by:** 53

**Status:** done (check on the live URL)

- [x] One outline (green in light mode, blue in dark) glides between
      navbar buttons, across both groups (pages; bell and account)
- [x] Starts the moment a button is clicked; same timing and smoothness
      (graphics-card animation) as the period pill
- [x] Fades out on pages with no navbar button (a repair, a slip)
- [x] Follows the page icons when they scroll sideways on a phone, and
      re-places on resize
- [x] Before it's placed, the active button outlines itself, so there is
      always one outline; instant for "reduce motion"
- [ ] Works on the live URL, at phone width, in light and dark mode
