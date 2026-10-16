"use client";

import { useEffect } from "react";
import { FILTERS_COOKIE, packFilters } from "@/lib/overview-filters";

/**
 * Remembers the Overview's tab, sort and staff filter (ticket 71) in a
 * small cookie on this browser for a year, so the server can open the
 * same view next time. Only those three settings: never the search, and
 * nothing about customers.
 */
export function RememberFilters({ tab, sort, staff }: { tab: string; sort: string; staff: string }) {
  useEffect(() => {
    document.cookie = `${FILTERS_COOKIE}=${packFilters(tab, sort, staff)}; path=/; max-age=31536000; samesite=lax`;
  }, [tab, sort, staff]);
  return null;
}
