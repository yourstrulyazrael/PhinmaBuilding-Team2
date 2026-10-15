"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote } from "lucide-react";
import { formatPeso, needsPaymentRef, PAYMENT_METHODS, type PaymentMethod } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Asks how much the customer paid, and how, before a job is marked
 * Picked up (ticket 19). A record only: no money moves through the app.
 *
 * Uses the browser's own <dialog>: it keeps keyboard focus inside, and
 * Esc or Cancel closes it without changing anything.
 */
export function PaymentDialog({
  open,
  price,
  device,
  onConfirm,
  onClose,
}: {
  open: boolean;
  price: number;
  device?: string;
  onConfirm: (amount: number, method: PaymentMethod, ref: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const askRef = needsPaymentRef(method);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    const ref = String(form.get("payment_ref") ?? "").trim();
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter the amount paid, ₱0 or more.");
      return;
    }
    if (askRef && !/^[0-9]{4}$/.test(ref)) {
      setError("Enter the last 4 digits of the reference number.");
      return;
    }
    setError(undefined);
    onConfirm(amount, method, askRef ? ref : "");
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="payment-title"
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-[1px]"
    >
      {open && (
        <form onSubmit={submit} className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
              <Banknote className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="payment-title" className="text-base font-semibold text-tertiary">
                Record payment
              </h2>
              <p className="text-sm text-muted-foreground">
                {device ? `${device}: ` : ""}final price {formatPeso(price)}. Saving marks it Picked up.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount paid (₱)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={price}
              required
              autoFocus
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Paid by</legend>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={cn(
                    "flex h-10 cursor-pointer items-center justify-center rounded-[var(--radius)] border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    method === m.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Only the last 4 digits: enough to match the payment in the
              e-wallet or card app, without storing the whole number. */}
          {askRef && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment_ref">Last 4 digits of the reference number</Label>
              <Input
                id="payment_ref"
                name="payment_ref"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="e.g. 1234"
                required
                className="w-32 font-mono tracking-widest"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save &amp; mark picked up</Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
