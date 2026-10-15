"use client";

import { useActionState } from "react";
import { updateJobDetails, type ActionResult } from "./actions";
import type { Job } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Everything here is shown to the customer on their tracking page.
// The revised estimate box only appears for the owner and staff the
// owner allows (ticket 23; staff ask for it, ticket 37, or propose one
// under this form, ticket 39); the database enforces the same rule.
export function JobDetailsForm({ job, canReviseEstimate }: { job: Job; canReviseEstimate: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateJobDetails.bind(null, job.id),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Diagnosis / repair notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={job.notes}
          placeholder="e.g. Screen replaced. Battery health is 78%, may need replacing soon."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="parts_replaced">Parts replaced</Label>
        <Input
          id="parts_replaced"
          name="parts_replaced"
          maxLength={500}
          defaultValue={job.parts_replaced}
          placeholder="e.g. LCD + digitizer assembly"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {canReviseEstimate && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="revised_estimate">Revised estimate (₱)</Label>
          <Input
            id="revised_estimate"
            name="revised_estimate"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={job.revised_estimate ?? ""}
            placeholder="Leave empty if unchanged"
          />
        </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="promised_date">Promised date</Label>
          <Input
            id="promised_date"
            name="promised_date"
            type="date"
            defaultValue={job.promised_date}
            required
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Confirm any revised estimate with the customer before continuing the repair.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {state.saved && !pending && (
          <p role="status" className="text-sm text-muted-foreground">
            Saved.
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
