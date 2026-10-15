"use client";

import { useActionState } from "react";
import { saveDetails, type DetailsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DetailsForm({
  displayName,
  contactNumber,
}: {
  displayName: string;
  contactNumber: string;
}) {
  const [state, formAction, pending] = useActionState<DetailsState, FormData>(
    saveDetails,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName}
          maxLength={80}
          placeholder="e.g. Zenith Repair"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact_number">Contact number</Label>
        <Input
          id="contact_number"
          name="contact_number"
          type="tel"
          defaultValue={contactNumber}
          maxLength={40}
          placeholder="e.g. 0917 123 4567"
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
