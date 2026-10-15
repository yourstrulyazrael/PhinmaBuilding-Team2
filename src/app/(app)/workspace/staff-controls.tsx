"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, CircleCheck, KeyRound, Pencil, UserMinus, X } from "lucide-react";
import {
  decideEstimateRequest,
  removeStaff,
  resetStaffPassword,
  revokeEstimatePermission,
  updateStaff,
  type EditStaffState,
  type ResetPasswordState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The owner's controls on each staff card (tickets 37 and 46). "use client"
// because they open, confirm and show results without a page reload.

// Revised estimates: shown, and taken back here; granted only by
// approving the staff member's request.
export function EstimateAccess({ staffId, allowed }: { staffId: string; allowed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (!allowed) {
    return <p className="text-xs text-muted-foreground">Can&apos;t revise quotes. They can ask you from their Account page.</p>;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Can revise quotes</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await revokeEstimatePermission(staffId);
            setError(result.error);
          })
        }
      >
        {pending ? "Taking back…" : "Take back"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Edit and Remove, side by side. Each opens in place.
export function StaffActions({ staffId, name, contact, openJobs }: { staffId: string; name: string; contact: string; openJobs: number }) {
  const [mode, setMode] = useState<"idle" | "edit" | "password" | "remove">("idle");
  const close = () => setMode("idle");

  if (mode === "edit") return <EditStaffForm staffId={staffId} name={name} contact={contact} onDone={close} />;
  if (mode === "password") return <ResetPasswordForm staffId={staffId} name={name} onDone={close} />;
  if (mode === "remove") return <ConfirmRemove staffId={staffId} name={name} openJobs={openJobs} onCancel={() => setMode("idle")} />;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => setMode("edit")}>
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setMode("password")}>
        <KeyRound className="size-3.5" aria-hidden />
        Reset password
      </Button>
      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setMode("remove")}>
        <UserMinus className="size-3.5" aria-hidden />
        Remove
      </Button>
    </div>
  );
}

function EditStaffForm({ staffId, name, contact, onDone }: { staffId: string; name: string; contact: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<EditStaffState, FormData>(updateStaff.bind(null, staffId), {});
  // Right after Save: a green ✓ "Details saved", then Close.
  if (state.saved && !pending) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="inline-flex animate-menu-in items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CircleCheck className="size-4" aria-hidden />
          Details saved
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Close</Button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`name-${staffId}`}>Name</Label>
        <Input id={`name-${staffId}`} name="display_name" defaultValue={name} maxLength={80} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`contact-${staffId}`}>Contact number</Label>
        <Input id={`contact-${staffId}`} name="contact_number" type="tel" defaultValue={contact} maxLength={40} required />
      </div>
      <p className="text-xs text-muted-foreground">
        Their email and password are theirs to change, on their Account page.
      </p>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone()}>Cancel</Button>
      </div>
    </form>
  );
}

// A new temporary password for someone who forgot theirs (ticket 46).
// Shown as plain text so the owner can read it back to them; the old
// one is never shown, because nobody can read it.
function ResetPasswordForm({ staffId, name, onDone }: { staffId: string; name: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetStaffPassword.bind(null, staffId),
    {},
  );
  if (state.done && !pending) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-muted p-3 text-sm">
        <p role="status" className="flex items-start gap-1.5">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          <span>
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Password reset.</span> {name} has
            been signed out everywhere and can now sign in with the new password. Tell them to change it on their
            Account page.
          </span>
        </p>
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onDone}>
          Close
        </Button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`password-${staffId}`}>New temporary password for {name}</Label>
        <Input
          id={`password-${staffId}`}
          name="new_password"
          type="text"
          autoComplete="off"
          spellCheck={false}
          minLength={8}
          maxLength={72}
          placeholder="At least 8 characters"
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Their old password stops working and they&apos;re signed out on every device. Give them this one in person or
        by message.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ConfirmRemove({ staffId, name, openJobs, onCancel }: { staffId: string; name: string; openJobs: number; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-destructive/10 p-3 text-sm">
      <p className="font-medium">Remove {name} from the shop?</p>
      <p className="text-xs text-muted-foreground">
        They can no longer sign in to your shop.
        {openJobs > 0 && ` Their ${openJobs} open repair${openJobs === 1 ? "" : "s"} move${openJobs === 1 ? "s" : ""} to you.`}{" "}
        Their name stays on past repairs. This can&apos;t be undone: to bring them back, add them again with a new email.
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await removeStaff(staffId);
              if (result.error) setError(result.error);
            })
          }
        >
          {pending ? "Removing…" : "Remove"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// One waiting request: the reason, a note box, Approve and Reject.
export function RequestDecision({ requestId }: { requestId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function decide(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await decideEstimateRequest(requestId, approve, note);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`note-${requestId}`} className="text-xs text-muted-foreground">
        Note to them (optional)
      </Label>
      <Input
        id={`note-${requestId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="e.g. Only for screen repairs, please"
      />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
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
