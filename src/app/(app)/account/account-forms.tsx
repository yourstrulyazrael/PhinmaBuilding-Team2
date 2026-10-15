"use client";

import { useActionState } from "react";
import {
  changeEmail,
  changePassword,
  saveDetails,
  saveShopDetails,
  saveSlipNote,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The forms on the Account page (ticket 34). "use client" because each
// shows "Saving…" and the result without reloading the page.

// Store details: owner only (the page hides it from staff; RLS refuses
// them anyway).
export function ShopDetailsForm({ shopId, name, address, phone }: { shopId: string; name: string; address: string; phone: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveShopDetails.bind(null, shopId), {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="shop_name" label="Shop name">
        <Input id="shop_name" name="shop_name" defaultValue={name} maxLength={80} required />
      </Field>
      <Field id="address" label="Address" hint="Optional. Shown on claim slips and the tracking page.">
        <Input id="address" name="address" defaultValue={address} maxLength={200} placeholder="e.g. Stall 12, Gaisano Mall, Iloilo City" />
      </Field>
      <Field id="phone" label="Shop phone" hint="Optional. Customers call this; if empty, they call your own number.">
        <Input id="phone" name="phone" type="tel" defaultValue={phone} maxLength={40} placeholder="e.g. (033) 123 4567" />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Save store details</Submit>
    </form>
  );
}

// The note at the bottom of every claim slip: owner only.
export function SlipNoteForm({ shopId, note }: { shopId: string; note: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveSlipNote.bind(null, shopId), {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="slip_note" label="Note at the bottom of the claim slip" hint="Optional, up to 500 characters. Leave empty for no note.">
        <Textarea
          id="slip_note"
          name="slip_note"
          defaultValue={note}
          maxLength={500}
          rows={4}
          placeholder="e.g. Please bring this slip when you pick up your phone. Devices unclaimed after 30 days are not our responsibility."
        />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Save claim slip</Submit>
    </form>
  );
}

// Name and contact number: everyone.
export function DetailsForm({ displayName, contactNumber }: { displayName: string; contactNumber: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveDetails, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="display_name" label="Account name">
        <Input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} placeholder="e.g. Juan Dela Cruz" required />
      </Field>
      <Field id="contact_number" label="Contact number">
        <Input id="contact_number" name="contact_number" type="tel" defaultValue={contactNumber} maxLength={40} placeholder="e.g. 0917 123 4567" required />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Save</Submit>
    </form>
  );
}

// Sign-in email: everyone. Only switches after the confirmation link.
export function EmailForm({ email, pendingEmail }: { email: string; pendingEmail?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeEmail, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm">
        Signed in as <span className="font-medium">{email}</span>
      </p>
      {pendingEmail && !state.saved && (
        <p className="text-sm text-muted-foreground">Waiting for you to confirm {pendingEmail}.</p>
      )}
      <Field id="email" label="New email">
        <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Change email</Submit>
    </form>
  );
}

// Password: everyone. A new key after success empties the boxes.
export function PasswordForm({ isOwner }: { isOwner: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form key={state.saved ? "saved" : "form"} action={formAction} className="flex flex-col gap-4">
      {!isOwner && (
        <p className="text-sm text-muted-foreground">Replace the temporary password your shop owner gave you.</p>
      )}
      <Field id="new_password" label="New password">
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field id="confirm_password" label="Type it again">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Result state={state} pending={pending} saved="Password changed." />
      <Submit pending={pending}>Change password</Submit>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Result({ state, pending, saved = "Saved." }: { state: FormState; pending: boolean; saved?: string }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.saved && !pending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {state.message ?? saved}
      </p>
    );
  }
  return null;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? "Saving…" : children}
    </Button>
  );
}
