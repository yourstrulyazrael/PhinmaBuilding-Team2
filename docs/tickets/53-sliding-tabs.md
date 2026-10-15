# 53 — Option switches glide

**What to build:** in switches like Today · 7 days · 30 days, the
highlight glides ("swooshes") to the option you pick instead of jumping.

**Blocked by:** 48

**Status:** done (check on the live URL). Smoothed in a follow-up: the
pill now glides with a transform-only "FLIP" animation (graphics card),
0.42 s on an iOS-like ease, text colours on the same curve.

- [x] One highlight per switch slides to the picked option (position and
      width), with the text colours cross-fading at the same time
- [x] It starts moving the moment you tap, before the new data loads
- [x] Used by the period picker (Inventory, Reports & analytics) in green,
      and the Workspace tabs as a raised white tile
- [x] No slide-in when the page first loads; instant for "reduce motion"
- [x] Still links: refresh and Back keep the choice
- [ ] Works on the live URL, at phone width, in light and dark mode
