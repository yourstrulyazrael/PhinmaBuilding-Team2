import { cache } from "react";

/**
 * Money, in the shop's own currency (ticket 54). The owner picks it on
 * Account; every amount on every page follows.
 *
 * Where the currency comes from:
 *   - Pages drawn on the server: money(amount) uses this request's
 *     currency, recorded by getShop() (lib/session.ts) or by the tracking
 *     page. React's cache() keeps it per request, so two shops loading
 *     pages at the same moment can't mix them up.
 *   - Parts drawn in the browser (forms, dialogs, charts): useMoney()
 *     from components/currency.tsx, which the layout fills in.
 */

// The currencies an owner can pick. Codes are the international ones.
export const CURRENCIES = [
  { code: "PHP", label: "Philippine peso" },
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "JPY", label: "Japanese yen" },
  { code: "SGD", label: "Singapore dollar" },
  { code: "MYR", label: "Malaysian ringgit" },
  { code: "IDR", label: "Indonesian rupiah" },
  { code: "THB", label: "Thai baht" },
  { code: "VND", label: "Vietnamese dong" },
  { code: "HKD", label: "Hong Kong dollar" },
  { code: "AUD", label: "Australian dollar" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "KRW", label: "South Korean won" },
  { code: "CNY", label: "Chinese yuan" },
  { code: "INR", label: "Indian rupee" },
  { code: "AED", label: "UAE dirham" },
  { code: "SAR", label: "Saudi riyal" },
] as const;

export type Currency = (typeof CURRENCIES)[number]["code"];

export function isCurrency(code: unknown): code is Currency {
  return CURRENCIES.some((c) => c.code === code);
}

// "₱1,500", "$12.50", "€9", in the given currency. Whole amounts have no
// decimals; others have two (the currency's own rule for yen and won).
export function formatMoney(amount: number | string, currency: string = "PHP") {
  const n = Number(amount);
  const code = isCurrency(currency) ? currency : "PHP";
  return new Intl.NumberFormat(code === "PHP" ? "en-PH" : "en", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    ...(Number.isInteger(n) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(n);
}

// Just the sign, for labels like "Initial quote (₱)".
export function currencySymbol(currency: string = "PHP") {
  const code = isCurrency(currency) ? currency : "PHP";
  return (
    new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? code
  );
}

// --- Server pages: this request's currency ---------------------------------

const requestBox = cache(() => ({ code: "PHP" as string }));

export function setRequestCurrency(code: string | null | undefined) {
  if (isCurrency(code)) requestBox().code = code;
}

export function requestCurrency() {
  return requestBox().code;
}

// An amount in this request's shop currency (server pages only; in the
// browser use useMoney()).
export function money(amount: number | string) {
  return formatMoney(amount, requestCurrency());
}
