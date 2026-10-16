import Link from "next/link";
import { redirect } from "next/navigation";
import { History, Store, TrendingUp } from "lucide-react";
import { formatPeso, todayInManila } from "@/lib/jobs";
import { periodFrom } from "@/lib/periods";
import { mostUsed, REASON_LABELS, stockLevel, type JobPart, type Movement, type Part } from "@/lib/inventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodPicker } from "@/components/period-picker";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { AddPartButton, CategoryList } from "./part-forms";
import { ExportMenu, ImportButton } from "./import-export";
import { PartsTable } from "./parts-table";
import { getNames, getShop, getSupabase, getUser } from "@/lib/session";

/**
 * Inventory (tickets 27–32), in the top bar for owner and staff, laid
 * out like the team's reference: header actions, three stat cards, the
 * parts table, then most used parts and the stock history.
 *
 * Everyone sees stock and retail prices; only the owner sees costs and
 * can add, import, export or change stock. The database enforces both
 * (supabase/sql/013-inventory.sql).
 */
export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");
  const period = periodFrom((await searchParams).period, todayInManila(), "30d");
  // Midnight in Manila at the start of the period, so the database only
  // sends the parts used in it.
  const since = new Date(`${period.from}T00:00:00+08:00`).toISOString();

  // All at once. RLS: only this shop's parts and history; part_costs
  // returns nothing for staff, so costs never reach their browser.
  const [shop, names, { data: partRows }, { data: costRows }, { data: movementRows }, { data: usedRows }] = await Promise.all([
    getShop(),
    getNames(),
    supabase.from("parts").select("*").order("name"),
    supabase.from("part_costs").select("part_id, cost"),
    supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("job_parts").select("*").gte("created_at", since),
  ]);
  const isOwner = shop?.role === "owner";
  const parts = ((partRows ?? []) as Part[]).map((p) => ({ ...p, category: p.category ?? "" }));
  const costs: Record<string, number> = Object.fromEntries((costRows ?? []).map((c) => [c.part_id, Number(c.cost)]));
  const movements = (movementRows ?? []) as Movement[];
  const partById = new Map(parts.map((p) => [p.id, p]));
  const used = mostUsed((usedRows ?? []) as JobPart[], parts, period);
  const active = parts.filter((p) => p.active);
  const categories = [...new Set(parts.map((p) => p.category).filter(Boolean))].sort();
  const retailValue = active.reduce((sum, p) => sum + Math.max(0, p.quantity) * Number(p.retail_price ?? 0), 0);
  const costValue = active.reduce((sum, p) => sum + Math.max(0, p.quantity) * (costs[p.id] ?? 0), 0);
  // The current inventory in the import template's columns (owner only:
  // it includes costs).
  const exportRows = active.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    cost: costs[p.id] ?? 0,
    retail_price: Number(p.retail_price ?? 0),
    quantity: p.quantity,
    low_stock_at: p.low_stock_at,
  }));

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-5 px-4 py-6 md:px-8 md:py-10 2xl:px-12">
      <CategoryList categories={categories} />

      <PageHeader
        eyebrow={shop?.name ?? "Your shop"}
        icon={Store}
        title="Inventory"
        crumbs={[{ label: "Inventory" }]}
        description={
          <>
            Keep your parts and stock levels up to date. Stock worth {formatPeso(retailValue)} at retail
            {isOwner && ` (${formatPeso(costValue)} at cost)`}.
          </>
        }
        actions={
          isOwner && (
            <>
              <ImportButton current={exportRows} />
              <ExportMenu current={exportRows} />
              <AddPartButton />
            </>
          )
        }
      />

      {isOwner && (
        <p className="-mt-1 text-sm text-primary">
          Import an Excel (.xlsx), CSV or JSON file with SKU and Name columns, plus optional Category, Cost, Retail price,
          Quantity and Low-stock level. Use Import parts to download a template and preview changes before saving.
        </p>
      )}

      <PartsTable parts={parts} costs={costs} isOwner={isOwner} />

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
                      <td
                        className={cn(
                          "py-2 text-right tabular-nums",
                          stockLevel(u.part) !== "ok" && "font-semibold text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {u.part.quantity}
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
