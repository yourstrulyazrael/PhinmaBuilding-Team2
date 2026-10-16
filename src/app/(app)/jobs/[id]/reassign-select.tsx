"use client";

import { useState, useTransition } from "react";
import { reassignJob } from "./actions";
import { useToast } from "@/components/toast";

/**
 * "Reassign to" for the owner (ticket 44): hand this repair to themself
 * or a current staff member. Saves as soon as a name is picked; the new
 * person can then change it and the old one sees it read-only.
 * A toast confirms it, with Undo to hand it back (ticket 67).
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
  const toast = useToast();
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "them";

  function reassign(to: string, from: string, isUndo = false) {
    setError(undefined);
    startTransition(async () => {
      const result = await reassignJob(jobId, to);
      if (result.error) {
        setError(result.error);
        toast({ kind: "error", title: "Couldn't reassign", description: result.error, action: { label: "Try again", onClick: () => reassign(to, from, isUndo) } });
        return;
      }
      toast(
        isUndo
          ? { title: `Back with ${nameOf(to)}` }
          : { title: `Reassigned to ${nameOf(to)}`, action: { label: "Undo", onClick: () => reassign(from, to, true) } },
      );
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-wrap items-center gap-2">
        <span className="sr-only">Reassign to</span>
        <select
          defaultValue={handledBy}
          key={handledBy}
          disabled={pending}
          onChange={(e) => reassign(e.target.value, handledBy)}
          className="h-9 rounded-[var(--radius)] border border-input bg-card px-2.5 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:opacity-60"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {pending && <span className="text-xs text-muted-foreground">Reassigning…</span>}
      </label>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
