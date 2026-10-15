import { redirect } from "next/navigation";
import { ChartColumn, ChartLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { formatPeso, todayInManila, type Job } from "@/lib/jobs";
import { periodFrom } from "@/lib/periods";
import { analytics, trend } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodPicker } from "@/components/period-picker";
import { TrendCharts } from "@/components/trend-charts";
import { cn } from "@/lib/utils";

/**
 * Analytics (tickets 10 and 26), its own page in the top bar, owner
 * only: it shows the shop's earnings. Today, the last 7 or 30 days;
 * every number and chart follows the chosen period.
 */
export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const shop = await getMyShop(supabase, user.id);
  if (shop?.role !== "owner") redirect("/");

  const today = todayInManila();
  const period = periodFrom((await searchParams).period, today, "30d");

  // RLS: only this shop's jobs.
  const { data, error } = await supabase.from("jobs").select("*");
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  const a = analytics(jobs, period);
  const points = trend(jobs, period);
  const maxStatus = Math.max(1, ...a.byStatus.map((s) => s.count));
  const maxDevice = Math.max(1, ...a.topDevices.map((d) => d.count));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">{period.label}, in Manila time.</p>
      </header>

      <PeriodPicker path="/analytics" current={period.key} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Key numbers">
        <Stat label="Received" value={String(a.received)} />
        <Stat label="Picked up" value={String(a.pickedUp)} />
        <Stat label="Earned" value={formatPeso(a.earned)} note="Paid at pickup" />
        <Stat label="Open repairs" value={String(a.openCount)} note="Right now" />
        <Stat label="Value of open repairs" value={formatPeso(a.openValue)} note="Right now" />
        <Stat
          label="Average turnaround"
          value={a.avgTurnaround === null ? "–" : `${a.avgTurnaround.toFixed(1)} days`}
          note="Drop-off to pickup"
        />
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <ChartLine className="size-4" aria-hidden />
            Trend
          </CardTitle>
          <CardDescription>{period.bucket === "hour" ? "Hour by hour, today." : `Day by day, ${period.label.toLowerCase()}.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendCharts points={points} bucket={period.bucket} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <ChartColumn className="size-4" aria-hidden />
              Jobs by status
            </CardTitle>
            <CardDescription>Repairs received in this period, by where they are now.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              {a.byStatus.map((s) => (
                <Bar key={s.status} label={s.label} count={s.count} max={maxStatus} className="bg-tertiary" />
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-tertiary">Most common devices</CardTitle>
            <CardDescription>What came in most often in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.topDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repairs in this period.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {a.topDevices.map((d) => (
                  <Bar key={d.label} label={d.label} count={d.count} max={maxDevice} className="bg-primary" />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-tertiary md:text-2xl">{value}</p>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </Card>
  );
}

// A simple horizontal bar: plain divs, no chart library.
function Bar({ label, count, max, className }: { label: string; count: number; max: number; className: string }) {
  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </li>
  );
}
