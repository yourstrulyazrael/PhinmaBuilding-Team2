"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { dismissCancelRequest, setStatus } from "./actions";
import { Button } from "@/components/ui/button";

// Shown on Job detail when the customer has asked to cancel (ticket 18).
// The shop decides: cancel the repair, or keep repairing.
export function CancelRequest({ jobId, reason, requestedOn }: { jobId: string; reason: string; requestedOn: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-destructive/40 bg-red-50 p-4 dark:bg-red-950/40"
    >
      <div className="flex items-start gap-3">
        <Ban className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-destructive">The customer asked to cancel this repair</p>
          <p className="text-sm text-muted-foreground">Requested {requestedOn}</p>
          {reason && <p className="text-sm">“{reason}”</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => run(() => setStatus(jobId, "cancelled"))}
        >
          Cancel the repair
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => dismissCancelRequest(jobId))}
        >
          Keep repairing
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
