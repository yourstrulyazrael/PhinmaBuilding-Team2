"use client";

import { createContext, useContext } from "react";
import { currencySymbol, formatMoney } from "@/lib/money";

/**
 * The shop's currency for parts drawn in the browser (ticket 54): forms,
 * dialogs, charts. The (app) layout and the tracking page wrap their
 * pages in <CurrencyProvider>; components call useMoney().
 */
const CurrencyContext = createContext("PHP");

export function CurrencyProvider({ currency, children }: { currency: string; children: React.ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useMoney() {
  const currency = useContext(CurrencyContext);
  return {
    currency,
    symbol: currencySymbol(currency),
    money: (amount: number | string) => formatMoney(amount, currency),
  };
}
