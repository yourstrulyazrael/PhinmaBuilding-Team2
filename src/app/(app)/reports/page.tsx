import { redirect } from "next/navigation";
import { ChartColumn } from "lucide-react";
import { formatDate, formatPeso, todayInManila, type Job } from "@/lib/jobs";
import { buildReport } from "@/lib/report";
import { partsMoney, type JobPart } from "@/lib/inventory";
import { periodFrom } from "@/lib/periods";
import { analytics, trend } from "@/lib/workspace";
import { PeriodPicker } from "@/components/period-picker";
import { TrendCharts } from "@/components/trend-charts";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { ReportToolbar } from "./report-toolbar";
import { getShop, getSupabase, getUser } from "@/lib/session";

/**
 * Reports & analytics (tickets 25–26, combined in ticket 33): one page in
 * the top bar, owner only, as it holds the shop's earnings and customer
 * names. Today, the last 7 or 30 days, or a whole month. Export PDF
 * prints this page; Export Excel builds a workbook from the same numbers.
 * The old /analytics address redirects here.
 */
export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  const shop = await getShop();
  if (shop?.role !== "owner") redirect("/");

  const period = periodFrom((await searchParams).period, todayInManila(), "30d", true);

  // RLS: only this shop's jobs, and only shopmates' names.
  // job_part_costs is owner-only, like this page.
  const [{ data, error }, { data: people }, { data: usedRows }, { data: costRows }] = await Promise.all([
    supabase.from("jobs").select("*"),
    supabase.from("technicians").select("id, display_name"),
    supabase.from("job_parts").select("*"),
    supabase.from("job_part_costs").select("job_part_id, unit_cost"),
  ]);
  if (error) throw error;
  const names = new Map((people ?? []).map((p) => [p.id as string, p.display_name as string]));
  const jobs = (data ?? []) as Job[];
  const parts = partsMoney(
    (usedRows ?? []) as JobPart[],
    new Map((costRows ?? []).map((c) => [c.job_part_id as string, Number(c.unit_cost)])),
    period,
  );
  const report = buildReport(jobs, period, names, parts);
  // What only the old Analytics page had: open repairs right now, the
  // status bars and the most common devices.
  const a = analytics(jobs, period);
  const points = trend(jobs, period);
  const maxStatus = Math.max(1, ...a.byStatus.map((s) => s.count));
  const maxDevice = Math.max(1, ...a.topDevices.map((d) => d.count));
  const margin = report.parts.sold > 0 ? Math.round((report.parts.profit / report.parts.sold) * 100) : null;

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-4 py-6 md:px-8 md:py-10 2xl:px-12 print:max-w-none print:gap-3 print:p-0">
      {/* Landscape paper for the wide jobs table. Only on this page. */}
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <PeriodPicker path="/reports" current={period.key} allowMonth />
        <ReportToolbar report={report} shopName={shop.name} points={points} bucket={period.bucket} />
      </div>

      <header className="flex items-center gap-3">
        <LogoMark size={40} alwaysLight />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-tertiary">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            Reports &amp; analytics · {report.periodLabel}, in Manila time
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
        <Stat label="Received" value={String(report.received)} />
        <Stat label="Picked up" value={String(report.pickedUp)} />
        <Stat label="Cancelled" value={String(report.cancelled)} />
        <Stat label="Earned" value={formatPeso(report.earned)} note="Paid at pickup" />
        <Stat
          label="Avg. turnaround"
          value={report.avgTurnaround === null ? "–" : `${report.avgTurnaround.toFixed(1)} days`}
          note="Drop-off to pickup"
        />
        <Stat label="Still open" value={String(report.stillOpen)} note="Of those received" />
        <Stat label="Open repairs" value={String(a.openCount)} note="Right now, all of them" />
        <Stat label="Value of open repairs" value={formatPeso(a.openValue)} note="Right now" />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3" aria-label="Parts">
        <Stat
          label="Parts sold"
          value={formatPeso(report.parts.sold)}
          note={`${report.parts.units} part${report.parts.units === 1 ? "" : "s"} used on repairs, at retail`}
        />
        <Stat label="Parts cost" value={formatPeso(report.parts.cost)} note="What those parts cost the shop" />
        <Stat
          label="Parts profit"
          value={formatPeso(report.parts.profit)}
          note={margin === null ? "Sold minus cost" : `${margin}% margin`}
        />
      </section>

      <Card className="p-4 print:break-inside-avoid print:shadow-none">
        <TrendCharts points={points} bucket={period.bucket} />
      </Card>

      <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3">
        <Card className="p-4 print:break-inside-avoid print:shadow-none">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-tertiary">
            <ChartColumn className="size-4" aria-hidden />
            Status of the jobs received
          </h2>
          <ul className="flex flex-col gap-2.5">
            {a.byStatus.map((s) => (
              <Bar key={s.status} label={s.label} count={s.count} max={maxStatus} className="bg-tertiary" />
            ))}
          </ul>
        </Card>

        <Card className="p-4 print:break-inside-avoid print:shadow-none">
          <h2 className="mb-3 text-sm font-semibold text-tertiary">Most common devices</h2>
          {a.topDevices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repairs in this period.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {a.topDevices.map((d) => (
                <Bar key={d.label} label={d.label} count={d.count} max={maxDevice} className="bg-primary" />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 print:break-inside-avoid print:shadow-none">
          <h2 className="mb-2 text-sm font-semibold text-tertiary">By payment method</h2>
          {report.byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pickups in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {report.byMethod.map((m) => (
                  <tr key={m.label} className="border-t border-border first:border-0">
                    <td className="py-1.5">{m.label}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{m.count} pickups</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{formatPeso(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto print:overflow-visible print:shadow-none">
        <h2 className="px-4 pt-4 text-sm font-semibold text-tertiary">Jobs received: {report.periodLabel.toLowerCase()}</h2>
        {report.rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No jobs received in this period.</p>
        ) : (
          <table className="mt-2 w-full min-w-[900px] text-sm print:min-w-0 print:text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Drop-off date", "Device", "Problem", "Customer", "Status", "Initial quote", "Revised quote", "Parts", "Paid", "Method", "Handled by"].map(
                  (h) => (
                    <th key={h} className={`px-3 py-2 font-medium ${["Initial quote", "Revised quote", "Parts", "Paid"].includes(h) ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 print:break-inside-avoid">
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(r.received)}</td>
                  <td className="px-3 py-2 font-medium">{r.device}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.problem}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPeso(r.initialQuote)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.revisedEstimate === null ? "" : formatPeso(r.revisedEstimate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.parts > 0 ? formatPeso(r.parts) : ""}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.paid === null ? "" : formatPeso(r.paid)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {r.method}
                    {r.ref && <span className="text-muted-foreground"> {r.ref}</span>}
                  </td>
                  <td className="px-3 py-2">{r.handledBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Earned counts what was paid at pickup in this period. Open repairs and their value are right now, whatever
        period is chosen. Customer phone numbers are left out of reports on purpose.
      </p>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4 print:p-3 print:shadow-none">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-tertiary">{value}</p>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </Card>
  );
}

// A simple horizontal bar: plain divs, no chart library. The colours are
// kept when printing, or the PDF would show empty bars.
function Bar({ label, count, max, className }: { label: string; count: number; max: number; className: string }) {
  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted [print-color-adjust:exact]">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </li>
  );
}
