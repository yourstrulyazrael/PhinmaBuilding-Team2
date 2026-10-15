import Link from "next/link";
import { Bell, CalendarClock, CircleCheck, Package, TrendingUp } from "lucide-react";
import type { Job } from "@/lib/jobs";
import { attentionAlerts, type Alert } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KINDS: Record<Alert["kind"], { icon: typeof Bell; tone: string }> = {
  overdue: { icon: CalendarClock, tone: "bg-red-50 text-destructive dark:bg-red-950" },
  ready: { icon: CircleCheck, tone: "bg-muted text-primary" },
  parts: { icon: Package, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  estimate: { icon: TrendingUp, tone: "bg-indigo-50 text-tertiary dark:bg-indigo-950" },
};

// Reminders for the technician, worked out from the jobs each time the
// page opens. Nothing here is sent to customers.
export function NotificationsTab({ jobs, today }: { jobs: Job[]; today: string }) {
  const alerts = attentionAlerts(jobs, today);

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
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up. Nothing needs your attention.</p>
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
                        {job.device} <span className="font-normal text-muted-foreground">· {job.customer_name}</span>
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
