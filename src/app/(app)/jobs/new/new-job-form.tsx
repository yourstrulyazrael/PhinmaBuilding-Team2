"use client";

import { useActionState } from "react";
import { createJob, type NewJobState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewJobForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState<NewJobState, FormData>(createJob, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-tertiary">Customer</legend>
        <Field label="Customer name" name="customer_name" maxLength={100} autoComplete="off" />
        <Field
          label="Customer Contact No."
          name="customer_phone"
          type="tel"
          inputMode="tel"
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. 0917 123 4567"
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-tertiary">Repair</legend>
        <Field label="Device" name="device" maxLength={100} placeholder="e.g. iPhone 12" />
        <Field
          label="Initial quote (₱)"
          name="initial_quote"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="e.g. 1500"
        />
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="problem">Problem</Label>
          <Textarea
            id="problem"
            name="problem"
            maxLength={500}
            rows={3}
            placeholder="e.g. Cracked screen, touch still works"
            required
          />
        </div>
        <Field label="Estimated completion date" name="promised_date" type="date" min={today} />
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save repair"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  );
}
