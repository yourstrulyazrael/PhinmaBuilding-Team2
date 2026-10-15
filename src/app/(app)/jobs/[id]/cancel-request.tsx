"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { dismissCancelRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { CancelRepairDialog } from "@/components/cancel-repair-dialog";

// Shown on Job detail when the customer has asked to cancel (ticket 18).
// The shop decides: cancel the repair, or keep repairing. Cancelling asks
// "Are you sure?" first (ticket 51); the two choices are hidden while
// that's open and come back if they keep repairing.
export function CancelRequest({
  jobId,
  device,
  reason,
  requestedOn,
}: {
  jobId: string;
  device: string;
  reason: string;
  requestedOn: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  function keep() {
    setError(undefined);
    startTransition(async () => {
      const result = await dismissCancelRequest(jobId);
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
      {!confirming && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Cancel the repair
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={keep}>
            {pending ? "Saving…" : "Keep repairing"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <CancelRepairDialog jobId={jobId} device={device} open={confirming} onClose={() => setConfirming(false)} />
    </div>
  );
}
