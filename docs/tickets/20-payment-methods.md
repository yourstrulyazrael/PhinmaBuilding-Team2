# 20 — Cash, e-wallet or card, with a reference

**What to build:** the payment box at pickup offers Cash, E-wallet and
Card. E-wallet and card also ask for the last 4 digits of the reference
number, which shows on Job detail for the shop only.

**Blocked by:** 19

**Status:** done

- [ ] The payment box offers Cash, E-wallet and Card
- [ ] Choosing E-wallet or Card shows a "Last 4 digits of reference"
      box, which must be exactly 4 digits; Cash does not ask for one
- [ ] Job detail shows e.g. "Paid ₱2,000 by Card (ref …1234)"
- [ ] The database itself refuses a reference that is not 4 digits, a
      reference on a cash payment, or an e-wallet/card payment without one
- [ ] Earlier GCash payments show as E-wallet; earlier "Other" payments
      still show as Other
- [ ] The reference never appears on the tracking page or claim slip
- [ ] Works on the live URL
