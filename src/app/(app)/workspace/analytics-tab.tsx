import { ChartColumn } from "lucide-react";
import { formatPeso, type Job } from "@/lib/jobs";
import { analytics } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// This month's numbers, in Manila time, worked out from the jobs.
export function AnalyticsTab({ jobs, today }: { jobs: Job[]; today: string }) {
  const a = analytics(jobs, today);
  const monthName = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  const maxStatus = Math.max(1, ...a.byStatus.map((s) => s.count));
  const maxDevice = Math.max(1, ...a.topDevices.map((d) => d.count));

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Key numbers">
        <Stat label={`Received in ${monthName}`} value={String(a.receivedThisMonth)} />
        <Stat label={`Picked up in ${monthName}`} value={String(a.pickedUpThisMonth)} />
        <Stat label={`Earned in ${monthName}`} value={formatPeso(a.earnedThisMonth)} note="Final price of picked-up jobs" />
        <Stat label="Open repairs" value={String(a.openCount)} />
        <Stat label="Value of open repairs" value={formatPeso(a.openValue)} note="Revised estimate, or the quote" />
        <Stat
          label="Average turnaround"
          value={a.avgTurnaround === null ? "–" : `${a.avgTurnaround.toFixed(1)} days`}
          note="Drop-off to pickup, from each job's last update"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <ChartColumn className="size-4" aria-hidden />
              Jobs by status
            </CardTitle>
            <CardDescription>All jobs, including picked up.</CardDescription>
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
            <CardDescription>What you repair most often.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.topDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repairs yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {a.topDevices.map((d) => (
                  <Bar key={d.label} label={d.label} count={d.count} max={maxDevice} className="bg-primary text-primary-foreground" />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-tertiary md:text-2xl">{value}</p>
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
