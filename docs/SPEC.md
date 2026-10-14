# Spec: GasBayan

## Problem
I fill up at the station closest to home because it is the one I know,
but other stations nearby charge ₱2–5 less per litre. At 13 litres a
week that is ₱100–260 a month I lose, and I have no quick way to find
out which station is cheapest right now.

## Solution
I open GasBayan, pick my fuel type, and see the stations near my route
sorted cheapest first, with how fresh each price is and how far away
the station is. When I pass a signboard, I sign in and report the
price, so the next Driver sees it.

## The user
A **Driver** in Iloilo City: anyone who fuels a vehicle (motorcycle,
tricycle, jeepney, car). We design and test around our teammate, who
rides a motorcycle between home and the University of Iloilo.

## User stories
1. As a Driver, I want to see stations sorted by the cheapest current
   price for my fuel type, so that I know where to fill up.
2. As a Driver, I want to see each price's age, so that I know whether
   to trust it.
3. As a Driver, I want to see how far each station is from me, so that I
   only ride to stations worth the trip.
4. As a Driver, I want to create an account and sign in with my email
   and password, so that I can report prices.
5. As a signed-in Driver, I want to report the price I see on a
   station's signboard, so that other Drivers get the latest price.
6. As a signed-in Driver, I want to tap "Still correct" on a current
   price, so that other Drivers know it has been checked.
7. As a Driver, I want impossible prices refused, so that the list stays
   believable.

## Screens
1. **Dashboard** (first screen, open to everyone): tabs for Regular
   Unleaded / Premium / Diesel. Every station sorted cheapest current
   price first, each showing name, current price, price age, number of
   confirmations, and distance (if the Driver allows location). Stations
   with no price yet show at the bottom as "No price yet". Signed-in
   Drivers see "Report price" and "Still correct" on each station.
   Everyone else sees a prompt to sign in. A short note under the list
   says: "Prices are reported by Drivers. Check the signboard."
2. **Navbar** (every screen): the GasBayan name, plus "Sign in" when
   signed out or "Sign out" when signed in.
3. **Sign in / Sign up**: email and password, with a switch between
   "I have an account" and "Create an account". Returns to the
   Dashboard afterwards.
4. **Report a price**: station (pre-chosen when coming from its row),
   fuel type, and price in pesos. Prices below ₱40 or above ₱100 are
   refused with a clear message. A second report for the same station
   and fuel type within an hour is refused with "You already reported
   this price recently". Returns to the Dashboard after saving.

## Data

**`stations`**: gas stations on or near the home ↔ University of Iloilo
route, added by hand by the team (10–20 rows).
- `id`, `name`, `address`, `latitude`, `longitude`, `created_at`
- Read: anyone. Insert, update, delete: nobody through the app. The team
  adds stations with SQL in the Supabase dashboard.

**`price_reports`**: one row per price reported by a Driver.
- `id`, `station_id` (the station), `fuel_type` (`regular`, `premium` or
  `diesel` only), `price` (pesos per litre, between 40 and 100),
  `reported_by` (the Driver's account id), `created_at`
- Read: anyone. Insert: signed-in Drivers only, and `reported_by` must
  be themselves. Update, delete: nobody.
- **Rate limit:** a Driver may report a station and fuel type at most
  once per hour. The database enforces this, not just the form.
- The **current price** for a station and fuel type is its newest
  report.

**`confirmations`**: one row per "Still correct" tap.
- `id`, `price_report_id` (the report), `confirmed_by` (the Driver's
  account id), `created_at`
- One confirmation per Driver per report. A Driver may not confirm
  their own report.
- Read: anyone. Insert: signed-in Drivers only, and `confirmed_by` must
  be themselves. Update, delete: nobody.
- A new report starts at 0 confirmations, because confirmations belong
  to a report, not to a station.

**Privacy:** no table stores names, emails or locations. Distance is
worked out in the Driver's browser and never sent or saved. Account ids
are never shown on screen.

## Login
Yes, but only for reporting and confirming. Viewing the Dashboard needs
no account. Supabase Auth with email and password, with "Confirm email"
turned off so that no emails are sent. The free plan's email limit would
otherwise break sign-ups during testing.

## Done for the demo
On the **live Vercel URL**:
- [ ] Dashboard loads without signing in and lists the team's stations.
- [ ] Switching fuel type re-sorts the list, cheapest first.
- [ ] Each price shows its age and its confirmation count.
- [ ] Allowing location shows the distance to each station. Refusing it
      still shows the list.
- [ ] A new Driver can create an account, sign in and sign out.
- [ ] A signed-in Driver can report a price, and the station moves to
      its new place in the list.
- [ ] A price of ₱20 or ₱150 is refused.
- [ ] Reporting the same station and fuel type twice within an hour is
      refused.
- [ ] The "Prices are reported by Drivers" note shows on the Dashboard.
- [ ] A different signed-in Driver can tap "Still correct", only once,
      and not on their own report.
- [ ] RLS is on for all three tables. Signed out, you cannot report or
      confirm.
- [ ] Tried on a phone by our rider teammate and 2–3 drivers near the
      UI gate.

## Out of scope
- Map view with price pins
- Live station search (Google Maps / Places API is a paid service)
- Photos of signboards as proof
- Admin or moderator approval of prices
- Email login links (passwordless sign-in)
- Editing or deleting reports, or undoing a confirmation
- Long-distance trips and stations outside the home ↔ UI route
- Other cities
