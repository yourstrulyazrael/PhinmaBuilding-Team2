import Link from "next/link";
import { Ban, Bell, CalendarClock, CircleCheck, Clock, Hand, Hourglass, Package, PackageX, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import type { Part } from "@/lib/inventory";
import { labourPrice, type Alert } from "@/lib/workspace";
import { formatPeso, type Job } from "@/lib/jobs";
import type { OwnerAnswer } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KINDS: Record<Alert["kind"], { icon: typeof Bell; tone: string }> = {
  cancel: { icon: Ban, tone: "bg-red-50 text-destructive dark:bg-red-950" },
  declined: { icon: ThumbsDown, tone: "bg-red-50 text-destructive dark:bg-red-950" },
  approved: { icon: ThumbsUp, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  overdue: { icon: CalendarClock, tone: "bg-red-50 text-destructive dark:bg-red-950" },
  due_today: { icon: Clock, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  due_tomorrow: { icon: Hourglass, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  ready: { icon: CircleCheck, tone: "bg-muted text-primary" },
  parts: { icon: Package, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  estimate: { icon: TrendingUp, tone: "bg-indigo-50 text-tertiary dark:bg-indigo-950" },
};

// Reminders for the technician, worked out from the open repairs each
// time a page opens (lib/session.ts, getNotifications). Nothing here is
// sent to customers. Each reminder names who is handling the phone, so
// it's clear who should act (ticket 13).
// A revised estimate a staff member proposed on an open repair.
export type Proposal = { id: string; job: Job; staffId: string; amount: number };

export function NotificationsList({
  alerts,
  me,
  names,
  lowStock,
  requests,
  proposals,
  answers,
}: {
  alerts: Alert[];
  me: string;
  names: Record<string, string>;
  lowStock: Part[]; // parts at or below their low-stock level (ticket 27)
  requests: number; // owner: staff requests to revise estimates (ticket 37)
  proposals: Proposal[]; // owner: revised estimates proposed on a repair (ticket 39)
  answers: OwnerAnswer[]; // staff: the owner approved or rejected what they sent (ticket 42)
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-tertiary">
          <Bell className="size-4" aria-hidden />
          Notifications
        </CardTitle>
        <CardDescription>
          Repairs that need you. These are reminders for you only: nothing is sent to customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {answers.length > 0 && (
          <ul className="flex flex-col gap-2">
            {answers.map((a) => (
              <li key={`${a.kind}-${a.id}`}>
                <Link
                  href={a.kind === "proposal" ? `/jobs/${a.jobId}` : "/account"}
                  className={cn(
                    "flex items-start gap-3 rounded-[var(--radius)] border p-3 text-sm",
                    a.approved
                      ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-950"
                      : "border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:hover:bg-red-950",
                  )}
                >
                  {a.approved ? (
                    <ThumbsUp className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  ) : (
                    <ThumbsDown className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-tertiary">
                      {a.kind === "proposal"
                        ? `Your owner ${a.approved ? "approved" : "rejected"} your ${formatPeso(a.amount)} revised quote for ${a.device}`
                        : `Your owner ${a.approved ? "approved" : "rejected"} your request to revise quotes`}
                    </span>
                    {a.note ? (
                      <span className="whitespace-pre-line">Owner&apos;s note: &ldquo;{a.note}&rdquo;</span>
                    ) : (
                      <span className="text-muted-foreground">No note from the owner.</span>
                    )}
                    {a.kind === "proposal" && a.approved && (
                      <span className="text-xs text-muted-foreground">The customer is being asked to accept it.</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {requests > 0 && (
          <Link
            href="/workspace?tab=staff"
            className="flex items-start gap-3 rounded-[var(--radius)] border border-highlight/40 bg-highlight/10 p-3 text-sm hover:bg-highlight/15"
          >
            <Hand className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-tertiary">
                {requests} request{requests === 1 ? "" : "s"} to revise quotes
              </span>
              <span className="text-muted-foreground">Staff are waiting for you to approve or reject.</span>
            </span>
          </Link>
        )}
        {proposals.length > 0 && (
          <ul className="flex flex-col gap-2">
            {proposals.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/jobs/${p.job.id}`}
                  className="flex items-start gap-3 rounded-[var(--radius)] border border-highlight/40 bg-highlight/10 p-3 text-sm hover:bg-highlight/15"
                >
                  <TrendingUp className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-tertiary">
                      {names[p.staffId] ?? "Someone"} proposes a {formatPeso(p.amount)} revised quote for {p.job.device}
                    </span>
                    <span className="text-muted-foreground">
                      {p.job.customer_name} · quote now {formatPeso(labourPrice(p.job))}. Open it to approve or reject.
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {lowStock.length > 0 && (
          <Link
            href="/inventory"
            className="flex items-start gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-3 text-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-950"
          >
            <PackageX className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-amber-900 dark:text-amber-100">
                Low stock: {lowStock.length} part{lowStock.length === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                {lowStock
                  .slice(0, 5)
                  .map((p) => `${p.name} (${p.quantity < 0 ? "check count" : p.quantity})`)
                  .join(", ")}
                {lowStock.length > 5 && ", …"}
              </span>
            </span>
          </Link>
        )}
        {alerts.length === 0 ? (
          answers.length + proposals.length + requests + lowStock.length === 0 && (
            <p className="text-sm text-muted-foreground">All caught up. Nothing needs your attention.</p>
          )
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {alerts.map(({ job, kind, message }) => {
              const { icon: Icon, tone } = KINDS[kind];
              return (
                <li key={`${job.id}-${kind}`}>
                  <Link href={`/jobs/${job.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/50">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-tertiary">
                        {job.device} <span className="font-normal text-muted-foreground">· {job.customer_name} · {job.handled_by === me ? "You" : (names[job.handled_by] ?? "Someone")}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{message}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
