"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { cancelRepair } from "@/app/(app)/jobs/[id]/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";

/**
 * "Are you sure?" before cancelling a repair (ticket 51). While it's open
 * the page behind is dimmed and can't be clicked (the browser's own
 * modal dialog), so no other choice can be picked by accident.
 *
 * - "Keep repairing" closes it; nothing changes.
 * - "Yes, cancel repair" shows "Cancelling…" straight away, then goes to
 *   the dashboard, which confirms it. A cancelled repair is final.
 */
export function CancelRepairDialog({
  jobId,
  device,
  open,
  onClose,
}: {
  jobId: string;
  device: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects, so this only returns on failure.
      const result = await cancelRepair(jobId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (pending) return; // don't close mid-cancel
        setError(undefined);
        onClose();
      }}
      title="Cancel this repair?"
      description={device}
    >
      <div className="flex items-start gap-3 rounded-[var(--radius)] border border-destructive/30 bg-red-50 p-3 text-sm dark:bg-red-950/40">
        <Ban className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p>
          The customer&apos;s tracking page will show it as cancelled. <strong>This can&apos;t be undone:</strong> a
          cancelled repair can&apos;t be edited any more.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose} autoFocus>
          Keep repairing
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? "Cancelling…" : "Yes, cancel repair"}
        </Button>
      </div>
    </Modal>
  );
}
