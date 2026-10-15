"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Send, X } from "lucide-react";
import { decideRevisedEstimate, proposeRevisedEstimate, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Proposing and answering a revised estimate on one repair (ticket 39).
// "use client" because they show "Sending…" and errors in place.

// Staff: the new amount and why. Sent to the owner, not the customer.
export function ProposeEstimateForm({ jobId, current }: { jobId: string; current: number }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    proposeRevisedEstimate.bind(null, jobId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">New amount (₱)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder={`Now ${current.toFixed(2)}`}
          required
          className="max-w-48"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Why?</Label>
        <Textarea
          id="reason"
          name="reason"
          minLength={10}
          maxLength={500}
          rows={3}
          required
          placeholder="e.g. Opened it up: the charging port is also damaged and needs replacing."
        />
        <p className="text-xs text-muted-foreground">10 to 500 characters. Only your owner sees this.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-fit">
        <Send className="mr-1.5 size-4" aria-hidden />
        {pending ? "Sending…" : "Send to owner"}
      </Button>
    </form>
  );
}

// Owner: an optional note, then Approve or Reject.
export function ProposalDecision({ proposalId, jobId }: { proposalId: string; jobId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function decide(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await decideRevisedEstimate(proposalId, jobId, approve, note);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`note-${proposalId}`} className="text-xs text-muted-foreground">
        Note to them (optional)
      </Label>
      <Input
        id={`note-${proposalId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="e.g. Fine, but call the customer first"
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => decide(true)}>
          <Check className="mr-1.5 size-3.5" aria-hidden />
          Approve
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => decide(false)}>
          <X className="mr-1.5 size-3.5" aria-hidden />
          Reject
        </Button>
      </div>
    </div>
  );
}
