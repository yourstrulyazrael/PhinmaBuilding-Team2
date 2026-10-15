import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { formatDate, formatPeso, todayInManila, type Job } from "@/lib/jobs";
import { buildReport, isMonth } from "@/lib/report";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/logo";
import { ReportToolbar } from "./report-toolbar";

/**
 * The monthly report (ticket 25), owner only: it holds the shop's
 * earnings and customer names. Export PDF prints this page; Export
 * Excel builds a workbook from the same numbers.
 */
export default async function ReportPage({ searchParams }: PageProps<"/workspace/report">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const shop = await getMyShop(supabase, user.id);
  if (shop?.role !== "owner") redirect("/workspace");

  const params = await searchParams;
  const month = isMonth(params.month) ? params.month : todayInManila().slice(0, 7);

  // RLS: only this shop's jobs, and only shopmates' names.
  const [{ data, error }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("*"),
    supabase.from("technicians").select("id, display_name"),
  ]);
  if (error) throw error;
  const names = new Map((people ?? []).map((p) => [p.id as string, p.display_name as string]));
  const report = buildReport((data ?? []) as Job[], month, names);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8 md:py-10 print:max-w-none print:gap-3 print:p-0">
      {/* Landscape paper for the wide jobs table. Only on this page. */}
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>

      <Link
        href="/workspace?tab=analytics"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit print:hidden" })}
      >
        <ArrowLeft className="mr-1.5 size-4" aria-hidden />
        Analytics
      </Link>

      <ReportToolbar report={report} shopName={shop.name} />

      <header className="flex items-center gap-3">
        <LogoMark size={40} alwaysLight />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-tertiary">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">Monthly report · {report.monthLabel}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-6" aria-label="Summary">
        <Stat label="Received" value={String(report.received)} />
        <Stat label="Picked up" value={String(report.pickedUp)} />
        <Stat label="Cancelled" value={String(report.cancelled)} />
        <Stat label="Still open" value={String(report.stillOpen)} note="Of those received" />
        <Stat label="Earned" value={formatPeso(report.earned)} note="Paid at pickup" />
        <Stat
          label="Avg. turnaround"
          value={report.avgTurnaround === null ? "–" : `${report.avgTurnaround.toFixed(1)} days`}
        />
      </section>

      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <Card className="p-4 print:shadow-none">
          <h2 className="mb-2 text-sm font-semibold text-tertiary">By payment method</h2>
          {report.byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pickups this month.</p>
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
        <Card className="p-4 print:shadow-none">
          <h2 className="mb-2 text-sm font-semibold text-tertiary">Status of this month&apos;s jobs</h2>
          {report.byStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs received this month.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {report.byStatus.map((s) => (
                  <tr key={s.label} className="border-t border-border first:border-0">
                    <td className="py-1.5">{s.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto print:overflow-visible print:shadow-none">
        <h2 className="px-4 pt-4 text-sm font-semibold text-tertiary">Jobs received in {report.monthLabel}</h2>
        {report.rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No jobs received this month.</p>
        ) : (
          <table className="mt-2 w-full min-w-[900px] text-sm print:min-w-0 print:text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Received", "Device", "Problem", "Customer", "Status", "Quote", "Revised", "Paid", "Method", "Handled by"].map(
                  (h) => (
                    <th key={h} className={`px-3 py-2 font-medium ${["Quote", "Revised", "Paid"].includes(h) ? "text-right" : ""}`}>
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
        Earned counts what was paid at pickup this month. Customer phone numbers are left out of reports on purpose.
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
