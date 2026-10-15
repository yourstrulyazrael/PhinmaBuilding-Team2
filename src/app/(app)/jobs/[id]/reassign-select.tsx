"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { reassignJob } from "./actions";

/**
 * "Reassign to" for the owner (ticket 44): hand this repair to themself
 * or a current staff member. Saves as soon as a name is picked; the new
 * person can then change it and the old one sees it read-only.
 */
export function ReassignSelect({
  jobId,
  handledBy,
  people,
}: {
  jobId: string;
  handledBy: string;
  people: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-wrap items-center gap-2">
        <span className="sr-only">Reassign to</span>
        <select
          defaultValue={handledBy}
          key={handledBy}
          disabled={pending}
          onChange={(e) => {
            const to = e.target.value;
            setError(undefined);
            setSaved(false);
            startTransition(async () => {
              const result = await reassignJob(jobId, to);
              if (result.error) setError(result.error);
              else setSaved(true);
            });
          }}
          className="h-9 rounded-[var(--radius)] border border-input bg-card px-2.5 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:opacity-60"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {pending && <span className="text-xs text-muted-foreground">Reassigning…</span>}
        {saved && !pending && (
          <span role="status" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CircleCheck className="size-3.5" aria-hidden />
            Reassigned
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
