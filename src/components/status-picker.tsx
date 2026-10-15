"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { recordPickup, setStatus } from "@/app/(app)/jobs/[id]/actions";
import { STATUSES, type PaymentMethod, type Status } from "@/lib/jobs";
import { PaymentDialog } from "./payment-dialog";
import { CancelRepairDialog } from "./cancel-repair-dialog";
import { StatusMenu } from "./status-menu";
import { cn } from "@/lib/utils";

/**
 * Change a job's status in one tap.
 *
 * - "buttons": all the statuses as buttons (Job detail screen)
 * - "select": a compact pill that opens a menu (Repair jobs list)
 *
 * Picking "Picked up" first asks for the payment (ticket 19); closing
 * that box leaves the status as it was. Picking "Cancelled" first asks
 * "Are you sure?" (ticket 51); while that's open the choices are off.
 *
 * useOptimistic shows the new status straight away, then the server
 * confirms. If saving fails, it snaps back and shows the error.
 */
export function StatusPicker({
  jobId,
  status,
  variant,
  price,
  device,
}: {
  jobId: string;
  status: Status;
  variant: "buttons" | "select";
  price: number; // the final price, offered as the amount paid
  device?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [askPayment, setAskPayment] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  function change(next: Status) {
    if (next === optimistic) return;
    setError(undefined);
    if (next === "cancelled") {
      setAskCancel(true);
      return;
    }
    if (next === "picked_up") {
      setAskPayment(true);
      return;
    }
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatus(jobId, next);
      if (result.error) setError(result.error);
    });
  }

  function confirmPayment(amount: number, method: PaymentMethod, ref: string) {
    setAskPayment(false);
    startTransition(async () => {
      setOptimistic("picked_up");
      const result = await recordPickup(jobId, amount, method, ref);
      if (result.error) setError(result.error);
    });
  }

  const dialog = (
    <>
      <PaymentDialog
        open={askPayment}
        price={price}
        device={device}
        onConfirm={confirmPayment}
        onClose={() => setAskPayment(false)}
      />
      <CancelRepairDialog
        jobId={jobId}
        device={device ?? "This repair"}
        open={askCancel}
        onClose={() => setAskCancel(false)}
      />
    </>
  );
  // While a question is open, the status choices can't be picked.
  const asking = askCancel || askPayment;

  if (variant === "select") {
    return (
      <div className="flex flex-col gap-1">
        <StatusMenu value={optimistic} pending={pending} onChange={change} />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Status">
        {STATUSES.map((s) => {
          const active = s.value === optimistic;
          const cancel = s.value === "cancelled";
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              disabled={pending || asking}
              onClick={() => change(s.value)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-3 text-sm font-medium transition-colors disabled:cursor-wait",
                active && !cancel && "border-primary bg-primary text-primary-foreground",
                active && cancel && "border-destructive bg-destructive text-destructive-foreground",
                !active && "border-border bg-card hover:bg-muted",
                !active && cancel && "text-destructive",
              )}
            >
              {active && <Check className="size-4" aria-hidden />}
              {s.label}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {dialog}
    </div>
  );
}
