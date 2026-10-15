"use client";

import { useState, useTransition } from "react";
import { Ban, Check, X } from "lucide-react";
import { answerEstimate, requestCancellation } from "./actions";
import { formatPeso } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Approve or Decline a revised estimate (ticket 17).
export function EstimateQuestion({ code, initial, revised }: { code: string; initial: number; revised: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function answer(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await answerEstimate(code, approve);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
      <div>
        <p className="font-medium text-tertiary">Please approve the new estimate</p>
        <p className="text-sm text-muted-foreground">
          After checking your phone, the price changed from {formatPeso(initial)} to{" "}
          <span className="font-semibold text-foreground">{formatPeso(revised)}</span>. Work continues once you
          approve.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => answer(true)}>
          <Check className="mr-1.5 size-4" aria-hidden />
          Approve
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => answer(false)}>
          <X className="mr-1.5 size-4" aria-hidden />
          Decline
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

// "Request cancellation", with an optional reason (ticket 18). Opens a
// small form first so a stray tap can't send it.
export function CancelRequestForm({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
      >
        <Ban className="size-3.5" aria-hidden />
        Request cancellation
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
        setError(undefined);
        startTransition(async () => {
          const result = await requestCancellation(code, reason);
          if (result.error) setError(result.error);
        });
      }}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4"
    >
      <div>
        <p className="font-medium text-tertiary">Request cancellation</p>
        <p className="text-sm text-muted-foreground">
          The shop will contact you to confirm. Any work already done may still need to be paid for.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea id="reason" name="reason" rows={3} maxLength={300} placeholder="e.g. I found a cheaper replacement" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
