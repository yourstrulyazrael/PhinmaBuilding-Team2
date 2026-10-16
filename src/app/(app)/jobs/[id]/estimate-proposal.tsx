"use client";

import { useMoney } from "@/components/currency";

import { useActionState, useState, useTransition } from "react";
import { Check, Send, X } from "lucide-react";
import { decideRevisedEstimate, proposeRevisedEstimate, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Proposing and answering a revised estimate on one repair (ticket 39).
// "use client" because they show "Sending…" and errors in place.

export type LastProposal = {
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  ownerNote: string;
  sentOn: string; // already formatted for display
};

const FORM_ID = "propose-estimate";

/**
 * Staff's revised estimate, under "Update for the customer" (ticket 39):
 * the amount and why, shown straight away; then `children` (Parts used);
 * then "Send to owner" at the very end of the card.
 *
 * Parts used has its own form, and forms can't sit inside each other, so
 * the button lives outside this one and points at it with form="…".
 * While a proposal waits for the owner, that shows instead of the form.
 * The owner's answer shows in its own box at the top of the card.
 */
export function ProposeEstimate({
  jobId,
  current,
  last,
  children,
}: {
  jobId: string;
  current: number;
  last: LastProposal | null;
  children: React.ReactNode;
}) {
  const { money, symbol } = useMoney();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    proposeRevisedEstimate.bind(null, jobId),
    {},
  );

  if (last?.status === "pending") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">Revised quote</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-highlight">Waiting for your owner:</span> you proposed{" "}
            <span className="tabular-nums">{money(last.amount)}</span> on {last.sentOn}.
          </p>
          <p className="whitespace-pre-line text-xs text-muted-foreground">&ldquo;{last.reason}&rdquo;</p>
        </div>
        {children}
      </div>
    );
  }

  // Spaced as one column (ticket 79): the revised quote, Parts used, then
  // "Send to owner" on its own row under a line, so it can't run into
  // the parts' Add button and it's clear it sends the revised quote.
  return (
    <div className="flex flex-col gap-6">
      <form id={FORM_ID} action={formAction} className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Revised quote ({symbol})</Label>
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
          <Label htmlFor="reason">Why the new quote?</Label>
          <Textarea
            id="reason"
            name="reason"
            minLength={10}
            maxLength={500}
            rows={3}
            required
            placeholder="e.g. Opened it up: the charging port is also damaged and needs replacing."
          />
          <p className="text-xs text-muted-foreground">
            10 to 500 characters. Goes to your owner to approve; the customer is asked only after that.
          </p>
        </div>
      </form>

      {children}

      <div className="flex flex-col items-end gap-2 border-t border-border pt-4">
        <p className="self-start text-xs text-muted-foreground">Sends the revised quote above to your owner.</p>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" form={FORM_ID} disabled={pending}>
          <Send className="size-4" aria-hidden />
          {pending ? "Sending…" : "Send to owner"}
        </Button>
      </div>
    </div>
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
          <Check className="size-3.5" aria-hidden />
          Approve
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => decide(false)}>
          <X className="size-3.5" aria-hidden />
          Reject
        </Button>
      </div>
    </div>
  );
}
