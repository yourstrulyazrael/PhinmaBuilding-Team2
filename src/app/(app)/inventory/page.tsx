import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowDownUp, History, PackagePlus, TrendingUp } from "lucide-react";
import { formatPeso, todayInManila } from "@/lib/jobs";
import { periodFrom } from "@/lib/periods";
import {
  lowStock,
  mostUsed,
  REASON_LABELS,
  stockLevel,
  type JobPart,
  type Movement,
  type Part,
  type StockLevel,
} from "@/lib/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodPicker } from "@/components/period-picker";
import { cn } from "@/lib/utils";
import { AddPartForm, PartActions } from "./part-forms";
import { ImportExport } from "./import-export";
import { getShop, getSupabase, getUser, getNames } from "@/lib/session";

/**
 * Inventory (tickets 27–29), in the top bar for owner and staff.
 * Everyone sees stock, the history and the most used parts; only the
 * owner sees costs and can add parts or change stock. The database
 * enforces both (supabase/sql/013-inventory.sql).
 */
export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");
  const shop = await getShop();
  const isOwner = shop?.role === "owner";
  const period = periodFrom((await searchParams).period, todayInManila(), "30d");

  // RLS: only this shop's parts and history. part_costs returns nothing
  // for staff, so costs never reach their browser.
  const [{ data: partRows }, { data: costRows }, { data: movementRows }, { data: usedRows }, names] = await Promise.all([
    supabase.from("parts").select("*").order("name"),
    supabase.from("part_costs").select("part_id, cost"),
    supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("job_parts").select("*"),
    getNames(),
  ]);
  const parts = (partRows ?? []) as Part[];
  const costs = new Map((costRows ?? []).map((c) => [c.part_id as string, Number(c.cost)]));
  const movements = (movementRows ?? []) as Movement[];
  const partById = new Map(parts.map((p) => [p.id, p]));
  const low = lowStock(parts);
  const used = mostUsed((usedRows ?? []) as JobPart[], parts, period);
  const active = parts.filter((p) => p.active);
  const archived = parts.filter((p) => !p.active);
  const stockValue = active.reduce((sum, p) => sum + Math.max(0, p.quantity) * (costs.get(p.id) ?? 0), 0);
  const retailValue = active.reduce((sum, p) => sum + Math.max(0, p.quantity) * Number(p.retail_price), 0);
  // The current inventory in the import template's columns (owner only:
  // it includes costs).
  const exportRows = parts
    .filter((p) => p.active)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      cost: costs.get(p.id) ?? 0,
      retail_price: Number(p.retail_price),
      quantity: p.quantity,
      low_stock_at: p.low_stock_at,
    }));

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-4 py-6 md:px-8 md:py-10 2xl:px-12">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} part{active.length === 1 ? "" : "s"}
            {` · stock worth ${formatPeso(retailValue)} at retail`}
            {isOwner && ` (${formatPeso(stockValue)} at cost)`}
          </p>
        </div>
      </header>

      {low.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-100">
              <AlertTriangle className="size-4" aria-hidden />
              Low stock ({low.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {low.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
                  {p.name}
                  <StockBadge part={p} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-tertiary">Parts</CardTitle>
          <CardDescription>
            {isOwner
              ? "Stock only changes by restocks, adjustments and parts used on repairs, so the history always adds up."
              : "What's in stock. Ask the owner to restock or add parts."}
          </CardDescription>
        </CardHeader>
        {parts.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No parts yet.{isOwner ? " Add your first one below." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Part</th>
                  <th className="px-3 py-2 text-right font-medium">In stock</th>
                  <th className="px-3 py-2 text-right font-medium">Low at</th>
                  <th className="px-3 py-2 text-right font-medium">Retail</th>
                  {isOwner && <th className="px-3 py-2 text-right font-medium">Cost</th>}
                  {isOwner && <th className="px-6 py-2"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {[...active, ...archived].map((p) => (
                  <tr key={p.id} className={cn("border-b border-border last:border-0", !p.active && "text-muted-foreground")}>
                    <td className="px-6 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-3 py-3 font-medium">
                      {p.name}
                      {!p.active && <span className="ml-2 text-xs font-normal">(archived)</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <StockBadge part={p} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{p.low_stock_at}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPeso(Number(p.retail_price))}</td>
                    {isOwner && <td className="px-3 py-3 text-right tabular-nums">{formatPeso(costs.get(p.id) ?? 0)}</td>}
                    {isOwner && (
                      <td className="px-6 py-3">
                        <PartActions part={p} cost={costs.get(p.id) ?? 0} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <ArrowDownUp className="size-4" aria-hidden />
              Import &amp; export
            </CardTitle>
            <CardDescription>Bring in an existing inventory, or take a copy of yours.</CardDescription>
          </CardHeader>
          <CardContent>
            <ImportExport current={exportRows} />
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <PackagePlus className="size-4" aria-hidden />
              Add a part
            </CardTitle>
            <CardDescription>The cost is only ever shown to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddPartForm />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <TrendingUp className="size-4" aria-hidden />
              Most used parts
            </CardTitle>
            <CardDescription>On repairs, {period.label.toLowerCase()}. Keep these in stock.</CardDescription>
            <PeriodPicker path="/inventory" current={period.key} />
          </CardHeader>
          <CardContent>
            {used.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parts recorded on repairs in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 font-medium">Part</th>
                    <th className="py-2 text-right font-medium">Used</th>
                    <th className="py-2 text-right font-medium">Repairs</th>
                    <th className="py-2 text-right font-medium">In stock</th>
                  </tr>
                </thead>
                <tbody>
                  {used.map((u) => (
                    <tr key={u.part.id} className="border-b border-border last:border-0">
                      <td className="py-2">{u.part.name}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{u.quantity}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{u.repairs}</td>
                      <td className="py-2 text-right">
                        <StockBadge part={u.part} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <History className="size-4" aria-hidden />
              Stock history
            </CardTitle>
            <CardDescription>The latest 30 changes. Nobody can edit or delete these.</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock changes yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {movements.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0">
                      <span className={cn("mr-2 font-semibold tabular-nums", m.change > 0 ? "text-primary" : "text-destructive")}>
                        {m.change > 0 ? "+" : "−"}
                        {Math.abs(m.change)}
                      </span>
                      {partById.get(m.part_id)?.name ?? "Part"}
                      <span className="text-muted-foreground">
                        {" · "}
                        {REASON_LABELS[m.reason]}
                        {m.job_id && (
                          <>
                            {" "}
                            <Link href={`/jobs/${m.job_id}`} className="underline-offset-4 hover:underline">
                              (view repair)
                            </Link>
                          </>
                        )}
                        {m.note && ` · ${m.note}`}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.created_by ? (names[m.created_by] ?? "Someone") : "System"} ·{" "}
                      {new Date(m.created_at).toLocaleString("en-US", {
                        timeZone: "Asia/Manila",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const LEVEL_STYLES: Record<StockLevel, string> = {
  ok: "bg-muted text-foreground",
  low: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  out: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  negative: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

// The stock count, coloured by level, with words so it isn't colour alone.
function StockBadge({ part }: { part: Part }) {
  const level = stockLevel(part);
  const words = { ok: "", low: "low", out: "out", negative: "check count" }[level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", LEVEL_STYLES[level])}>
      {part.quantity}
      {words && <span className="font-normal">· {words}</span>}
    </span>
  );
}
