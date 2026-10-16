import { Check, Clock, ShieldCheck } from "lucide-react";
import type { Status } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const STEPS = ["Checked in", "Diagnosing", "Repairing", "Ready for pickup", "Picked up"] as const;

// Where each status sits on the line. Waiting for parts is a pause in
// the repairing step; a warranty return goes back to repairing.
const POSITION: Record<Status, number> = {
  received: 0,
  diagnosing: 1,
  waiting_for_parts: 2,
  repairing: 2,
  ready_for_pickup: 3,
  picked_up: 4,
  warranty: 2,
  cancelled: -1,
};

/**
 * How far along the repair is (ticket 70): five steps from check-in to
 * pickup, done steps ticked, the current one highlighted. Screen readers
 * hear "Step 3 of 5: Repairing".
 */
export function RepairStepper({ status }: { status: Status }) {
  if (status === "cancelled") return null;
  const at = POSITION[status];
  const label = (i: number) =>
    i === 2 && status === "waiting_for_parts"
      ? "Waiting for parts"
      : i === 2 && status === "warranty"
        ? "Warranty repair"
        : STEPS[i];

  return (
    <ol className="flex w-full items-start" aria-label={`Step ${at + 1} of ${STEPS.length}: ${label(at)}`}>
      {STEPS.map((_, i) => {
        const done = i < at || status === "picked_up";
        const current = i === at && status !== "picked_up";
        const paused = current && status === "waiting_for_parts";
        const Icon = paused ? Clock : status === "warranty" && current ? ShieldCheck : Check;
        return (
          <li key={i} aria-current={current ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
            {/* The line to the next step. */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 top-3.5 h-0.5 w-full",
                  i < at || status === "picked_up" ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                current && !paused && "border-primary bg-card text-primary ring-4 ring-primary/15",
                paused && "border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-500/15 dark:bg-amber-950 dark:text-amber-300",
                !done && !current && "border-border bg-card text-muted-foreground",
              )}
            >
              {done || paused || (current && status === "warranty") ? <Icon className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "max-w-20 text-[11px] leading-tight sm:text-xs",
                current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label(i)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
