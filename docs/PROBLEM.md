# GasBayan

## Who
A **Driver** in Iloilo City who fuels up regularly. Our real example is
our teammate, who rides a motorcycle every day between home and the
University of Iloilo. Tricycle, jeepney and car drivers use the app in
exactly the same way: they look at prices and they report prices.

## The struggle
Our teammate fills up at the gas station a couple of blocks from home
because it is the closest and most familiar, not because it is the
cheapest. Other stations nearby are **₱2–5 per litre cheaper**, but there
is no easy way to know which ones or by how much.

Our teammate puts in about **13 litres a week** (one full tank). That is
**₱26–65 a week, roughly ₱100–260 a month**, overpaid by one student.
For jeepney and tricycle drivers, who fill up more and live on thin
margins, the loss is bigger.

## Today's workaround
- Go to the usual station and pay whatever it charges.
- Notice signboards while riding past, and try to remember them.
- Ask friends.

A group chat could share prices, but it buries old posts, cannot sort by
cheapest, and does not show how fresh a price is.

## The MVP
GasBayan shows Drivers the gas stations near them, sorted cheapest first
for their fuel type, using prices reported by other Drivers.

What is in:
- A **dashboard** anyone can view without signing in: stations sorted
  cheapest first for Regular Unleaded, Premium or Diesel, with price age
  and distance.
- Distance is worked out in the Driver's browser. Their location is
  **never saved**.
- **Email and password sign-in** to report prices, with a sign-in
  button in the navbar. (Changed from login links during /to-spec: the
  free plan's email limit could block sign-ups during testing.)
- Signed-in Drivers can **report a price** and tap **"Still correct"** to
  confirm an existing one.
- Impossible prices (e.g. below ₱40 or above ₱100 per litre) are
  rejected.
- The dashboard shows the **most recent** report for each station and
  fuel type.
- 10–20 stations on or near the home ↔ University of Iloilo route,
  added by hand by our team.

## How we'll know it worked
**The demo (3 minutes):** open GasBayan → see the cheapest stations
nearby, sorted, with "reported 2h ago" → sign in → report a new price →
watch that station move to the top of the list.

**Who tries it before Session 3:**
- Our motorcycle-riding teammate, on their real daily route.
- 2–3 drivers we do not know, approached near the University of Iloilo
  gate (e.g. tricycle drivers). One named team member is responsible for
  doing this.

## Out of scope
- Map view with price pins
- Live station search (Google Maps / Places API is a paid service)
- Photos of signboards as proof
- Admin or moderator approval of prices
- Long-distance trips and stations outside the home ↔ UI route
- Other cities

## Glossary
- **Driver**: anyone who fuels a vehicle (motorcycle, tricycle, jeepney,
  car). The app's one type of user. Can view prices without signing in,
  and must sign in to report or confirm.
- **Station**: a gas station on or near the home ↔ University of Iloilo
  route, added by hand by our team.
- **Fuel type**: one of Regular Unleaded, Premium, or Diesel.
- **Price report**: a price for one fuel type at one station, entered by
  a signed-in Driver from the station's signboard, with the time it was
  entered.
- **Current price**: the most recent price report for a station and fuel
  type. This is what the dashboard shows.
- **Price age**: how long ago the current price was reported ("reported
  3 hours ago").
- **Confirmation**: a signed-in Driver tapping "Still correct" on a
  current price.
- **Dashboard**: the first screen. Stations sorted cheapest first for the
  chosen fuel type, with current price, price age, confirmations and
  distance.
