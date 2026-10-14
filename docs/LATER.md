# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.


## From /grill-with-docs (2026-10-14)

- **Map view** — show stations as pins with prices on a map. The sorted
  list comes first.
- **Live station search** — find stations automatically instead of
  adding them by hand. Google Maps / Places API is a paid service, so it
  is not in our stack.
- **Signboard photos** — Drivers attach a photo as proof of a price.
- **Admin / moderator approval** — someone approves prices before they
  show. This adds a second type of user.
- **Long-distance trips** — stations along unfamiliar routes, outside the
  home ↔ University of Iloilo route.
- **Other cities** — beyond Iloilo City.

## From /to-spec (2026-10-14)

- **Email login links** (passwordless sign-in). Swapped for email and
  password, because the free plan's email limit could block sign-ups
  during testing.
- **Editing or deleting reports, and undoing a confirmation.** Reports
  are a history for the MVP.

## Price trust ideas (2026-10-14)

No single source of truth exists for street prices. These layers make
fake prices harder to post and quicker to fade.

- **"Looks unusual" warning** — flag a report far from nearby stations'
  prices or the DOE's published price range for the area.
- **Weekly price-change check** — oil companies announce changes on
  Monday, effective Tuesday. Flag reports that move far more than that.
- **Agreement over time** — mark a price "trusted" only when 2+
  different Drivers report similar prices.
- **Reputation** — Drivers whose reports usually agree with others
  count for more.
- **Verified station owners** post official prices. Adds a second type
  of user.
- **Stronger accounts** — turn "Confirm email" back on, or add another
  check, so one person cannot make many fake accounts to confirm a
  wrong price. (Off in the MVP because of the free plan's email limit.)

## Ways to make money (2026-10-14)

Rule: viewing and reporting prices stay free. Free reports are what
make GasBayan valuable.

- **Freemium extras** — price-drop alerts, price history charts, saved
  favourite stations and routes.
- **Featured stations** — stations pay for a clearly labelled highlight.
  Must never change the cheapest-first order.
- **Group plans** — delivery riders, TODAs, jeepney groups, businesses
  with vehicles.
- **Anonymous price data reports** — averages and trends for fuel
  companies, researchers or local government. Never personal data:
  selling names, emails, locations or individual habits without clear
  consent breaks the Data Privacy Act of 2012 (RA 10173). Needs a
  privacy policy first.
- **Promo partnerships** — discount codes with stations or shops.
- **Ads** — last, and only with strong daily traffic.
- Payments and ad networks are outside the workshop stack; they need
  team agreement before any build.
