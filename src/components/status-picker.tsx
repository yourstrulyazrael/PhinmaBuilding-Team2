"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { recordPickup, setStatus } from "@/app/(app)/jobs/[id]/actions";
import { STATUSES, type PaymentMethod, type Status } from "@/lib/jobs";
import { PaymentDialog } from "./payment-dialog";
import { CancelRepairDialog } from "./cancel-repair-dialog";
import { StatusMenu } from "./status-menu";
import { useToast } from "./toast";
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
 *
 * Toasts (ticket 67): after a change, "Undo" puts the old status back;
 * if it failed, "Try again" repeats it. Pickups (a payment) and
 * cancelling (asked first) have no Undo.
 */
const labelOf = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;

export function StatusPicker({
  jobId,
  status,
  variant,
  price,
  device,
  withPayment = false,
}: {
  jobId: string;
  status: Status;
  variant: "buttons" | "select";
  price: number; // the final price, offered as the amount paid
  device?: string;
  // The repair page action bar (ticket 70): a Record payment button too.
  withPayment?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [askPayment, setAskPayment] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const toast = useToast();
  // "Back under warranty" is only offered for a repair that was picked up
  // (ticket 57); the database also checks the warranty hasn't ended.
  const choices = STATUSES.filter((s) => s.value !== "warranty" || optimistic === "picked_up" || optimistic === "warranty");

  function change(next: Status) {
    if (next === optimistic) return;
    setError(undefined);
    if (next === "cancelled") {
      setAskCancel(true);
      return;
    }
    // Handing back a warranty repair: it was paid for already, so no
    // payment box (the first payment is kept).
    if (next === "picked_up" && optimistic !== "warranty") {
      setAskPayment(true);
      return;
    }
    save(next, optimistic);
  }

  // Saves a status; on success offers Undo (back to "from"), on failure
  // offers Try again. Undoing doesn't offer another Undo.
  function save(next: Status, from: Status, isUndo = false) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setStatus(jobId, next);
      if (result.error) {
        setError(result.error);
        toast({
          kind: "error",
          title: "Couldn't change the status",
          description: result.error,
          action: { label: "Try again", onClick: () => save(next, from, isUndo) },
        });
        return;
      }
      toast(
        isUndo
          ? { title: `Back to ${labelOf(next)}`, description: device }
          : {
              title: `Status: ${labelOf(next)}`,
              description: device,
              action: { label: "Undo", onClick: () => save(from, next, true) },
            },
      );
    });
  }

  function confirmPayment(amount: number, method: PaymentMethod, ref: string) {
    setAskPayment(false);
    startTransition(async () => {
      setOptimistic("picked_up");
      const result = await recordPickup(jobId, amount, method, ref);
      if (result.error) setError(result.error);
      else toast({ title: "Payment recorded · Picked up", description: device });
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
        <div className="flex items-center gap-2">
          <StatusMenu value={optimistic} pending={pending} onChange={change} options={choices} />
          {withPayment && !["picked_up", "cancelled", "warranty"].includes(optimistic) && (
            <Button type="button" size="sm" disabled={pending || asking} onClick={() => setAskPayment(true)}>
              <CreditCard className="size-4" aria-hidden />
              Record payment
            </Button>
          )}
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Status">
        {choices.map((s) => {
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
                "flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-3 text-sm font-medium transition-[background-color,border-color,color,transform] active:scale-[0.97] disabled:cursor-wait motion-reduce:active:scale-100",
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
