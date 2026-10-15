# 41 — Decline asks why; the bell clears and blinks

**What to build:** a customer declining a revised estimate confirms and
says why; the bell's badge counts only new notifications, and blinks
when one arrives.

**Blocked by:** 40

**Status:** in progress (needs `supabase/sql/021-estimate-decline-reason.sql` run)

Decline (tracking page)
- [x] Decline opens a confirm step in the same box: "Decline the new
      estimate?", a required "Why are you declining?" (up to 300
      characters), "Yes, decline" and "Go back"
- [x] The reason is saved on the repair (`jobs.estimate_decline_reason`),
      only by the customer's own function; the shop can't edit it; it is
      cleared when the estimate changes
- [x] The shop sees it on the repair ("Customer declined" and the
      reason) and in the declined notification
- [x] Until 021 is run, answering still works (without the reason)

Bell
- [x] Each notification has a stable name; opening Notifications marks
      all current ones as seen, and the badge counts only unseen ones
      (low stock still counts once)
- [x] When a notification you've never been shown arrives, the badge
      pulses and the bell wiggles a few times (not with reduced motion)
- [x] The page's data refreshes every 30 seconds while the tab is
      visible, so new notifications arrive without reloading
- [x] "Seen" is remembered in this browser, per person (a convenience:
      clearing it or using another device just shows the full count)
- [ ] Run 021; on the live URL decline with a reason, check the shop
      sees it; open Notifications and watch the badge clear; trigger a
      new notification from another device and watch the bell blink
