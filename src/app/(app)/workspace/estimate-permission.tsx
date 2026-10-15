"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setEstimatePermission } from "./actions";
import { cn } from "@/lib/utils";

// The owner's "Can revise estimates" switch for one staff member.
export function EstimatePermission({ staffId, name, allowed }: { staffId: string; name: string; allowed: boolean }) {
  const [on, setOn] = useOptimistic(allowed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function toggle() {
    setError(undefined);
    startTransition(async () => {
      setOn(!on);
      const result = await setEstimatePermission(staffId, !on);
      if (result.error) setError(result.error);
    });
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        Can revise estimates
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${name} can revise estimates`}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
            on ? "bg-primary" : "bg-input",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block size-4 rounded-full bg-white shadow transition-transform",
              on ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
