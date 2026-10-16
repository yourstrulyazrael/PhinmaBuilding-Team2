// Which top-level section an address belongs to (ticket 78), so the
// navigation highlights the right button on inner pages too:
//   /jobs/123, its claim slip and receipt  -> Overview (the repairs list)
//   /jobs/new                              -> Add a repair
//   /inventory/…, /workspace?tab=staff…    -> that section
export function inSection(href: string, pathname: string) {
  if (href === "/") return pathname === "/" || (pathname.startsWith("/jobs/") && pathname !== "/jobs/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}
