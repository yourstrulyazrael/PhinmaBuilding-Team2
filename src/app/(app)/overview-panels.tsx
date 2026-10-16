import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  CircleCheck,
  History,
  Minus,
  PackageCheck,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPeso, STATUSES, type Job } from "@/lib/jobs";
import { addDays, analytics, trend } from "@/lib/workspace";
import type { Period } from "@/lib/periods";
import { cn } from "@/lib/utils";

// --- KPI trends (ticket 69) ---------------------------------------------
//
// The last 7 days against the 7 days before, with a small line of the
// daily numbers. Revenue is the owner's only, like Reports.

export function KpiStrip({ jobs, today, isOwner }: { jobs: Job[]; today: string; isOwner: boolean }) {
  const week: Period = { key: "7d", from: addDays(today, -6), to: today, label: "Last 7 days", bucket: "day" };
  const before: Period = { ...week, from: addDays(today, -13), to: addDays(today, -7) };
  const now = analytics(jobs, week);
  const then = analytics(jobs, before);
  const points = trend(jobs, week);

  return (
    <section aria-label="Last 7 days" className="grid gap-3 sm:grid-cols-3 md:gap-4">
      <Kpi
        label="Completed repairs"
        icon={PackageCheck}
        value={String(now.pickedUp)}
        change={compare(now.pickedUp, then.pickedUp)}
        line={points.map((p) => p.pickedUp)}
      />
      {isOwner ? (
        <Kpi
          label="Revenue"
          icon={Banknote}
          value={formatPeso(now.earned)}
          change={compare(now.earned, then.earned)}
          line={points.map((p) => p.earned)}
        />
      ) : (
        <Kpi
          label="Phones checked in"
          icon={Smartphone}
          value={String(now.received)}
          change={compare(now.received, then.received)}
          line={points.map((p) => p.received)}
        />
      )}
      <Kpi
        label="Average turnaround"
        icon={Timer}
        value={now.avgTurnaround === null ? "—" : `${now.avgTurnaround.toFixed(1)} days`}
        // Faster is better: a drop is good news.
        change={compare(now.avgTurnaround, then.avgTurnaround, true)}
      />
    </section>
  );
}

type Change = { text: string; direction: "up" | "down" | "flat"; good: boolean | null };

function compare(now: number | null, then: number | null, lowerIsBetter = false): Change {
  if (now === null || then === null) return { text: "No earlier data", direction: "flat", good: null };
  if (now === then) return { text: "Same as the week before", direction: "flat", good: null };
  const up = now > then;
  const pct = then === 0 ? null : Math.round((Math.abs(now - then) / then) * 100);
  return {
    text: `${pct === null ? "Up from 0" : `${pct}% ${up ? "up" : "down"}`} vs the week before`,
    direction: up ? "up" : "down",
    good: up !== lowerIsBetter,
  };
}

function Kpi({
  label,
  icon: Icon,
  value,
  change,
  line,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  change: Change;
  line?: number[];
}) {
  const Arrow = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <Card className="flex flex-col gap-2 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="size-4" aria-hidden />
          {label}
        </p>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">7 days</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums text-tertiary">{value}</p>
        {line && <Sparkline values={line} />}
      </div>
      <p
        className={cn(
          "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          change.good === null && "bg-muted text-muted-foreground",
          change.good === true && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
          change.good === false && "bg-red-50 text-destructive dark:bg-red-950",
        )}
      >
        <Arrow className="size-3.5" aria-hidden />
        {change.text}
      </p>
    </Card>
  );
}

// A tiny line of the last seven days, for the shape only (the number
// above it is the real figure).
function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 32;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="var(--primary)" fillOpacity={0.08} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// --- Recent activity (ticket 69) ----------------------------------------
//
// The latest things that happened in the shop, from job_events (written
// by the database, supabase/sql/031).

export type JobEvent = {
  id: number;
  job_id: string;
  actor: string | null;
  kind: "created" | "status" | "payment" | "reassigned" | "estimate_answer";
  detail: string;
  created_at: string;
  job: { device: string } | null;
};

const EVENT_ICONS: Record<JobEvent["kind"], LucideIcon> = {
  created: Smartphone,
  status: CircleCheck,
  payment: Banknote,
  reassigned: ArrowRightLeft,
  estimate_answer: ThumbsUp,
};

export function ActivityFeed({
  events,
  missing,
  names,
  me,
}: {
  events: JobEvent[];
  missing: boolean; // 031 not run yet
  names: Record<string, string>;
  me: string;
}) {
  const who = (id: string | null) => (id === null ? "The customer" : id === me ? "You" : (names[id] ?? "Someone"));

  return (
    <Card className="flex flex-col">
      <h2 className="flex items-center gap-2 px-5 pt-5 text-lg font-semibold text-tertiary">
        <History className="size-5" aria-hidden />
        Recent activity
      </h2>
      {missing ? (
        <p className="p-5 text-sm text-muted-foreground">
          Run <code className="font-mono">supabase/sql/031-job-events.sql</code> in Supabase to start the history.
        </p>
      ) : events.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Nothing yet. Check in a phone and it shows up here.</p>
      ) : (
        <ol className="flex flex-col p-3">
          {events.map((e) => {
            const declined = e.kind === "estimate_answer" && e.detail === "declined";
            const Icon = declined ? ThumbsDown : EVENT_ICONS[e.kind];
            return (
              <li key={e.id}>
                <Link
                  href={`/jobs/${e.job_id}`}
                  className="flex items-start gap-3 rounded-inner px-2 py-2.5 hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-tertiary",
                      declined && "bg-red-50 text-destructive dark:bg-red-950",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm">{describe(e, who, names, me)}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {e.job?.device ?? "A repair"} · <time dateTime={e.created_at}>{timeAgo(e.created_at)}</time>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function describe(e: JobEvent, who: (id: string | null) => string, names: Record<string, string>, me: string) {
  const actor = who(e.actor);
  switch (e.kind) {
    case "created":
      return `${actor} checked in a phone`;
    case "status":
      return `${actor} set it to ${STATUSES.find((s) => s.value === e.detail)?.label ?? e.detail}`;
    case "payment":
      return `${actor} recorded the payment · picked up`;
    case "reassigned":
      return `${actor} handed it to ${e.detail === me ? "you" : (names[e.detail] ?? "someone")}`;
    case "estimate_answer":
      return `The customer ${e.detail} the revised quote`;
  }
}

// "5 min ago", measured when the page is drawn.
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}
