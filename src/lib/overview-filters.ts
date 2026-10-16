// The Overview's remembered tab, sort and staff filter (ticket 71):
// "tab.sort.staff" in a cookie. Shared by the page (reads it) and
// RememberFilters (writes it in the browser).
export const FILTERS_COOKIE = "zr-overview";

export function packFilters(tab: string, sort: string, staff: string) {
  return [tab, sort, staff].join(".");
}

export function unpackFilters(raw: string | undefined) {
  const [tab, sort, staff] = (raw ?? "").split(".");
  return { tab: tab || undefined, sort: sort || undefined, staff: staff || undefined };
}
