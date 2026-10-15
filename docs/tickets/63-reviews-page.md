# 63 — A Reviews page with CSAT, DSAT and a leaderboard

**What to build:** a page in the top bar for customer reviews, measured
as CSAT and DSAT, with filters and a ranking of who keeps the best
reviews.

**Blocked by:** 62

**Status:** in progress (needs `supabase/sql/029-review-scores.sql` run)

- [x] "Reviews" (star) in the top bar, for the owner and staff
- [x] CSAT = share of 4–5★ reviews; DSAT = share of 1–2★; 3★ is neutral.
      Four cards: CSAT, DSAT, average rating, number of reviews
- [x] Filters: period (Today · 7 days · 30 days, or a month), rating (All ·
      CSAT · Neutral · DSAT), and for the owner one person; kept in the
      address
- [x] Leaderboard: best CSAT first, then lowest DSAT, more reviews, higher
      average; 3 reviews in the period to be ranked; medals for the top
      three; "(you)" highlighted
- [x] The list: stars, CSAT/Neutral/DSAT chip, device (links to the
      repair), technician (owner), date and comment
- [x] Private: everyone sees the leaderboard's scores (counts only, from
      shop_review_scores); the owner sees every comment, staff only their
      own
- [ ] Run 029; on the live URL check the filters and the leaderboard as
      the owner and as staff
