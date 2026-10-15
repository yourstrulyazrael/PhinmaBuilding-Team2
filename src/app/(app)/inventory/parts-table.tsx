"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Barcode, Package, Search, X } from "lucide-react";
import { stockLevel, type Part, type StockLevel } from "@/lib/inventory";
import { formatPeso } from "@/lib/jobs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PartRowActions } from "./part-forms";

const PAGE = 50;

// Sorting (ticket 51): click a column heading, or use "Sort by" on a phone.
type SortKey = "name" | "category" | "cost" | "retail" | "stock" | "newest";
type Sort = { key: SortKey; dir: "asc" | "desc" };
const SORT_OPTIONS: { label: string; sort: Sort }[] = [
  { label: "Name, A to Z", sort: { key: "name", dir: "asc" } },
  { label: "Name, Z to A", sort: { key: "name", dir: "desc" } },
  { label: "Category", sort: { key: "category", dir: "asc" } },
  { label: "Stock, lowest first", sort: { key: "stock", dir: "asc" } },
  { label: "Stock, highest first", sort: { key: "stock", dir: "desc" } },
  { label: "Retail, lowest first", sort: { key: "retail", dir: "asc" } },
  { label: "Retail, highest first", sort: { key: "retail", dir: "desc" } },
  { label: "Newest added", sort: { key: "newest", dir: "desc" } },
];

/**
 * The three stat cards and the "All parts" table (ticket 32). Search,
 * the Running-low filter and paging all happen in the browser, so they
 * respond instantly; only 50 rows are drawn at a time, so a big catalog
 * stays fast.
 */
export function PartsTable({ parts, costs, isOwner }: { parts: Part[]; costs: Record<string, number>; isOwner: boolean }) {
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [sort, setSort] = useState<Sort>({ key: "name", dir: "asc" });
  // Typing stays smooth even with thousands of parts: the filtering
  // catches up a moment later.
  const search = useDeferredValue(query.trim().toLowerCase());

  const active = useMemo(() => parts.filter((p) => p.active), [parts]);
  const archivedCount = parts.length - active.length;
  const low = active.filter((p) => stockLevel(p) !== "ok");
  const units = active.reduce((sum, p) => sum + Math.max(0, p.quantity), 0);

  const rows = useMemo(() => {
    const words = search.split(/\s+/).filter(Boolean);
    return parts
      .filter((p) => (showArchived ? true : p.active))
      .filter((p) => !lowOnly || (p.active && stockLevel(p) !== "ok"))
      .filter((p) => {
        if (words.length === 0) return true;
        const text = `${p.name} ${p.sku} ${p.category}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
        let diff: number;
        switch (sort.key) {
          case "category":
            // Parts with no category go last, whichever way.
            diff = (a.category || "￿").localeCompare(b.category || "￿", undefined, { sensitivity: "base" });
            break;
          case "cost":
            diff = (costs[a.id] ?? 0) - (costs[b.id] ?? 0);
            break;
          case "retail":
            diff = Number(a.retail_price ?? 0) - Number(b.retail_price ?? 0);
            break;
          case "stock":
            diff = a.quantity - b.quantity;
            break;
          case "newest":
            diff = a.created_at.localeCompare(b.created_at);
            break;
          default:
            diff = byName;
        }
        // Ties fall back to the name, A to Z.
        return (sort.dir === "asc" ? diff : -diff) || byName;
      });
  }, [parts, search, lowOnly, showArchived, sort, costs]);

  // A heading click sorts by that column; a second click reverses it.
  function sortBy(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setShown(PAGE);
  }

  function heading(label: string, sortKey: SortKey, className?: string) {
    const on = sort.key === sortKey;
    const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th key={sortKey} className={cn("px-3 py-3 font-semibold", className)} aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => sortBy(sortKey)}
          className={cn(
            "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 uppercase tracking-wider hover:bg-muted hover:text-foreground",
            on && "text-primary",
          )}
        >
          {label}
          <Icon className={cn("size-3", !on && "opacity-50")} aria-hidden />
        </button>
      </th>
    );
  }

  const visible = rows.slice(0, shown);

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
        <Stat label="Total parts" value={active.length.toLocaleString("en-PH")} />
        <Stat label="Units in stock" value={units.toLocaleString("en-PH")} />
        <button
          type="button"
          onClick={() => {
            setLowOnly((v) => !v);
            setShown(PAGE);
          }}
          aria-pressed={lowOnly}
          className={cn(
            "rounded-[var(--radius)] text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            lowOnly && "ring-2 ring-amber-400",
          )}
        >
          <Card className="flex h-full flex-col gap-1 p-4 hover:bg-muted/40 md:p-5">
            <p className="text-sm text-muted-foreground">Running low</p>
            <p className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-tertiary md:text-3xl">{low.length}</span>
              <span className={cn("text-sm font-medium", low.length > 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
                {lowOnly ? "showing these · tap to show all" : "needs attention"}
              </span>
            </p>
          </Card>
        </button>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
          <div>
            <h2 className="font-semibold text-tertiary">{lowOnly ? "Running low" : "All parts"}</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length.toLocaleString("en-PH")} {rows.length === 1 ? "item" : "items"}
              {search ? " match" : lowOnly ? " need restocking" : " in your catalog"}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            {archivedCount > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                Show archived ({archivedCount})
              </label>
            )}
            <label className="relative flex w-full items-center sm:w-52">
              <span className="sr-only">Sort by</span>
              <ArrowUpDown className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
              <select
                value={`${sort.key}:${sort.dir}`}
                onChange={(e) => {
                  const [key, dir] = e.target.value.split(":") as [SortKey, Sort["dir"]];
                  setSort({ key, dir });
                  setShown(PAGE);
                }}
                className="h-10 w-full appearance-none rounded-[var(--radius)] border border-input bg-card pl-9 pr-3 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 md:text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.label} value={`${o.sort.key}:${o.sort.dir}`}>
                    {o.label}
                  </option>
                ))}
                {/* A heading click can pick an order the list doesn't name. */}
                {!SORT_OPTIONS.some((o) => o.sort.key === sort.key && o.sort.dir === sort.dir) && (
                  <option value={`${sort.key}:${sort.dir}`}>
                    {sort.key === "cost" ? "Cost" : sort.key.charAt(0).toUpperCase() + sort.key.slice(1)},{" "}
                    {sort.dir === "asc" ? "ascending" : "descending"}
                  </option>
                )}
              </select>
            </label>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Search name, category or SKU"
                aria-label="Search parts"
                className="pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {parts.length === 0
              ? isOwner
                ? "No parts yet. Use Add part or Import parts above."
                : "No parts yet. The owner adds them."
              : "No parts match."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  {heading("Part", "name", "px-4 md:px-6")}
                  {heading("Category", "category")}
                  {isOwner && heading("Cost", "cost")}
                  {heading("Retail", "retail")}
                  {heading("Stock", "stock")}
                  {isOwner && <th className="px-4 py-3 text-right font-semibold md:px-6">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={cn("border-t border-border", !p.active && "opacity-60")}>
                    <td className="px-4 py-3 md:px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-muted text-primary">
                          <Package className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {p.name}
                            {!p.active && <span className="ml-2 text-xs font-normal text-muted-foreground">(archived)</span>}
                          </p>
                          <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                            <Barcode className="size-3" aria-hidden />
                            {p.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-primary">{p.category || <span className="text-muted-foreground">–</span>}</td>
                    {isOwner && <td className="px-3 py-3 font-mono tabular-nums">{formatPeso(costs[p.id] ?? 0)}</td>}
                    <td className="px-3 py-3 font-mono tabular-nums">{formatPeso(Number(p.retail_price ?? 0))}</td>
                    <td className="px-3 py-3">
                      <StockPill part={p} />
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 md:px-6">
                        <PartRowActions part={p} cost={costs[p.id] ?? 0} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > shown && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm md:px-6">
            <span className="text-muted-foreground">
              Showing {shown.toLocaleString("en-PH")} of {rows.length.toLocaleString("en-PH")}
            </span>
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="font-medium text-primary underline-offset-4 hover:underline">
              Show {Math.min(PAGE, rows.length - shown)} more
            </button>
          </div>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4 md:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-tertiary md:text-3xl">{value}</p>
    </Card>
  );
}

const PILL: Record<StockLevel, string> = {
  ok: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  low: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  out: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  negative: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

// "12 in stock", "2 · low", "Out of stock", "-1 · check count": words as
// well as colour.
function StockPill({ part }: { part: Part }) {
  const level = stockLevel(part);
  const text =
    level === "ok" ? `${part.quantity} in stock`
    : level === "low" ? `${part.quantity} · low`
    : level === "out" ? "Out of stock"
    : `${part.quantity} · check count`;
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", PILL[level])}>{text}</span>;
}
