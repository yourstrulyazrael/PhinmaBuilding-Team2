"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setStatus } from "@/app/(app)/jobs/[id]/actions";
import { STATUSES, STATUS_STYLES, type Status } from "@/lib/jobs";
import { cn } from "@/lib/utils";

/**
 * Change a job's status in one tap.
 *
 * - "buttons": all six statuses as buttons (Job detail screen)
 * - "select": a compact dropdown (Repair jobs list)
 *
 * useOptimistic shows the new status straight away, then the server
 * confirms. If saving fails, it snaps back and shows the error.
 */
export function StatusPicker({
  jobId,
  status,
  variant,
}: {
  jobId: string;
  status: Status;
  variant: "buttons" | "select";
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function change(next: Status) {
    if (next === optimistic) return;
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatus(jobId, next);
      if (result.error) setError(result.error);
    });
  }

  if (variant === "select") {
    return (
      <div className="flex flex-col gap-1">
        <select
          aria-label="Status"
          value={optimistic}
          disabled={pending}
          onChange={(e) => change(e.target.value as Status)}
          className={cn(
            "h-8 w-fit cursor-pointer rounded-full border-0 py-0 pl-3 pr-7 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
            STATUS_STYLES[optimistic],
          )}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="bg-card text-foreground">
              {s.label}
            </option>
          ))}
        </select>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Status">
        {STATUSES.map((s) => {
          const active = s.value === optimistic;
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => change(s.value)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-3 text-sm font-medium transition-colors disabled:cursor-wait",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {active && <Check className="size-4" aria-hidden />}
              {s.label}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
