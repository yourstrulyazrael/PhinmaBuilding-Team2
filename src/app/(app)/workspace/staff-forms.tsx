"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStaff, type AddStaffState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, PHONE_HINT, PHONE_PATTERN, useFormValidation } from "@/components/form-validation";

// The owner fills this in to create a staff member's account (ticket 22).
// In a pop-up (ticket 74): onAdded closes it once the account exists.
export function AddStaffForm({ onAdded }: { onAdded?: (name: string) => void }) {
  const [state, formAction, pending] = useActionState<AddStaffState, FormData>(addStaff, {});
  const told = useRef(state);
  useEffect(() => {
    if (state === told.current) return;
    told.current = state;
    if (state.added) onAdded?.(state.added);
  }, [state, onAdded]);
  const v = useFormValidation(); // errors under each field (ticket 75)

  return (
    // A new key after each success empties the form for the next person.
    <form key={state.added ?? "new"} action={formAction} {...v.formProps} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_name">Name</Label>
          <Input id="staff_name" name="display_name" maxLength={80} placeholder="e.g. Jun Reyes" required {...v.field("display_name")} />
          <FieldError name="display_name" error={v.errors.display_name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_contact">Contact number</Label>
          <Input id="staff_contact" name="contact_number" type="tel" maxLength={40} pattern={PHONE_PATTERN} title={PHONE_HINT} placeholder="e.g. 0917 123 4567" required {...v.field("contact_number")} />
          <FieldError name="contact_number" error={v.errors.contact_number} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_email">Email (their login)</Label>
          <Input id="staff_email" name="email" type="email" autoComplete="off" placeholder="e.g. jun@example.com" required {...v.field("email")} />
          <FieldError name="email" error={v.errors.email} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_password">Temporary password</Label>
          <Input
            id="staff_password"
            name="password"
            type="text"
            autoComplete="off"
            minLength={8}
            placeholder="At least 8 characters"
            required
            {...v.field("password")}
          />
          <FieldError name="password" error={v.errors.password} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Give them the email and temporary password. They can change the password on their Account page once
        signed in. Staff can add repairs and work on the phones they handle, but can&apos;t change prices.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.added && !pending && (
        <p role="status" className="text-sm text-primary">
          {state.added} was added to your shop.
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-fit self-end">
        {pending ? "Creating account…" : "Add staff"}
      </Button>
    </form>
  );
}

