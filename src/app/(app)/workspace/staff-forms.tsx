"use client";

import { useActionState } from "react";
import { addStaff, changePassword, type AddStaffState, type PasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The owner fills this in to create a staff member's account (ticket 22).
export function AddStaffForm() {
  const [state, formAction, pending] = useActionState<AddStaffState, FormData>(addStaff, {});

  return (
    // A new key after each success empties the form for the next person.
    <form key={state.added ?? "new"} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_name">Name</Label>
          <Input id="staff_name" name="display_name" maxLength={80} placeholder="e.g. Jun Reyes" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_contact">Contact number</Label>
          <Input id="staff_contact" name="contact_number" type="tel" maxLength={40} placeholder="e.g. 0917 123 4567" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="staff_email">Email (their login)</Label>
          <Input id="staff_email" name="email" type="email" autoComplete="off" placeholder="e.g. jun@example.com" required />
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
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Give them the email and temporary password. They can change the password in their Shop settings once
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

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creating account…" : "Add staff"}
      </Button>
    </form>
  );
}

// Everyone can change their own password.
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(changePassword, {});

  return (
    <form key={state.saved ? "saved" : "form"} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new_password">New password</Label>
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password">Type it again</Label>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Password changed.
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
