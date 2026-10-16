"use client";

import { cloneElement, createContext, isValidElement, useActionState, useContext, useEffect } from "react";
import {
  changeEmail,
  changePassword,
  requestEstimatePermission,
  saveDetails,
  saveShopDetails,
  saveSlipNote,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast";
import { CURRENCIES, currencySymbol } from "@/lib/money";
import { FieldError, PHONE_HINT, PHONE_PATTERN, useFormValidation } from "@/components/form-validation";

// The forms on the Account page (ticket 34). "use client" because each
// shows "Saving…" and the result without reloading the page.

// Store details: owner only (the page hides it from staff; RLS refuses
// them anyway).
export function ShopDetailsForm({
  shopId,
  name,
  address,
  phone,
  currency,
  hours,
  warrantyDays,
}: {
  shopId: string;
  name: string;
  address: string;
  phone: string;
  currency: string;
  hours: string;
  warrantyDays: number;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveShopDetails.bind(null, shopId), {});
  return (
    <CheckedForm action={formAction} className="flex flex-col gap-4">
      <Field id="shop_name" label="Shop name">
        <Input id="shop_name" name="shop_name" defaultValue={name} maxLength={80} required />
      </Field>
      <Field id="address" label="Address" hint="Optional. Shown on claim slips and the tracking page.">
        <Input id="address" name="address" defaultValue={address} maxLength={200} placeholder="e.g. Stall 12, Gaisano Mall, Iloilo City" />
      </Field>
      <Field id="phone" label="Shop phone" hint="Optional. Customers call this; if empty, they call your own number.">
        <Input id="phone" name="phone" type="tel" defaultValue={phone} maxLength={40} pattern={PHONE_PATTERN} title={PHONE_HINT} placeholder="e.g. (033) 123 4567" />
      </Field>
      <Field id="hours" label="Opening hours" hint={"Optional. Goes in the \"ready for pickup\" message."}>
        <Input id="hours" name="hours" defaultValue={hours} maxLength={120} placeholder="e.g. Mon–Sat, 9 AM–6 PM" />
      </Field>
      <Field
        id="warranty_days"
        label="Warranty (days)"
        hint="On every repair from the day it's picked up; shown on claim slips, receipts and the tracking page. 0 for none."
      >
        <Input
          id="warranty_days"
          name="warranty_days"
          type="number"
          inputMode="numeric"
          min={0}
          max={365}
          step={1}
          defaultValue={warrantyDays}
          required
          className="w-32"
        />
      </Field>
      <Field
        id="currency"
        label="Currency"
        hint="Every price, payment and report in your shop, and on customers' pages, uses it. Amounts aren't converted."
      >
        <select
          id="currency"
          name="currency"
          defaultValue={currency}
          className="h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-base shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 md:text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {currencySymbol(c.code)} · {c.label} ({c.code})
            </option>
          ))}
        </select>
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Save store details</Submit>
    </CheckedForm>
  );
}

// The note at the bottom of every claim slip: owner only.
export function SlipNoteForm({ shopId, note }: { shopId: string; note: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveSlipNote.bind(null, shopId), {});
  return (
    <CheckedForm action={formAction} className="flex flex-col gap-4">
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
    </CheckedForm>
  );
}

// Name and contact number: everyone.
export function DetailsForm({ displayName, contactNumber }: { displayName: string; contactNumber: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveDetails, {});
  return (
    <CheckedForm action={formAction} className="flex flex-col gap-4">
      <Field id="display_name" label="Account name">
        <Input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} placeholder="e.g. Juan Dela Cruz" required />
      </Field>
      <Field id="contact_number" label="Contact number">
        <Input id="contact_number" name="contact_number" type="tel" defaultValue={contactNumber} maxLength={40} pattern={PHONE_PATTERN} title={PHONE_HINT} placeholder="e.g. 0917 123 4567" required />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Save</Submit>
    </CheckedForm>
  );
}

// Sign-in email: everyone. Only switches after the confirmation link.
export function EmailForm({ email, pendingEmail }: { email: string; pendingEmail?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeEmail, {});
  return (
    <CheckedForm action={formAction} className="flex flex-col gap-4">
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
    </CheckedForm>
  );
}

// Password: everyone. A new key after success empties the boxes.
export function PasswordForm({ isOwner }: { isOwner: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <CheckedForm key={state.saved ? "saved" : "form"} action={formAction} className="flex flex-col gap-4">
      {!isOwner && (
        <p className="text-sm text-muted-foreground">Replace the temporary password your shop owner gave you.</p>
      )}
      <Field id="new_password" label="New password">
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field id="confirm_password" label="Type it again">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required onInput={checkMatch} />
      </Field>
      <Result state={state} pending={pending} saved="Password changed." />
      <Submit pending={pending}>Change password</Submit>
    </CheckedForm>
  );
}

// Staff ask to revise estimates (ticket 37). Once sent, the page shows
// the waiting request instead of this form.
export function EstimateRequestForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(requestEstimatePermission, {});
  return (
    <CheckedForm action={formAction} className="flex flex-col gap-4">
      <Field id="reason" label="Why do you need it?" hint="10 to 500 characters. Your owner or a lead technician reads this before deciding.">
        <Textarea
          id="reason"
          name="reason"
          minLength={10}
          maxLength={500}
          rows={3}
          required
          placeholder="e.g. I handle most screen repairs and often find extra damage once the phone is open."
        />
      </Field>
      <Result state={state} pending={pending} />
      <Submit pending={pending}>Send request</Submit>
    </CheckedForm>
  );
}

// Every form here checks its fields before sending (ticket 75): errors
// show under the field (Field below), and Save is stopped until fixed.
const Checks = createContext<ReturnType<typeof useFormValidation> | null>(null);

function CheckedForm({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement> & { action: (data: FormData) => void }) {
  const v = useFormValidation();
  return (
    <Checks.Provider value={v}>
      <form {...props} {...v.formProps}>
        {children}
      </form>
    </Checks.Provider>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  const v = useContext(Checks);
  // The box gets its red outline and is linked to its message.
  const box = v && isValidElement(children) ? cloneElement(children as React.ReactElement<Record<string, unknown>>, v.field(id)) : children;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {box}
      <FieldError name={id} error={v?.errors[id]} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// "Type it again" must match the new password.
function checkMatch(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const first = (el.form?.elements.namedItem("new_password") as HTMLInputElement | null)?.value ?? "";
  el.setCustomValidity(el.value && el.value !== first ? "The two passwords don't match." : "");
}

// Each result is toasted once, even if its form redraws (the password
// form starts afresh after saving).
const toasted = new WeakSet<FormState>();

// Errors stay next to the form; "Saved" is a toast (ticket 67).
function Result({ state, pending, saved = "Saved." }: { state: FormState; pending: boolean; saved?: string }) {
  const toast = useToast();
  useEffect(() => {
    if (!state.saved || toasted.has(state)) return;
    toasted.add(state);
    toast({ title: state.message ?? saved });
  }, [state, saved, toast]);
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  // Shown under the form too while it matters (e.g. "check your email").
  if (state.saved && !pending && state.message) {
    return (
      <p className="text-sm text-muted-foreground">
        {state.message}
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
