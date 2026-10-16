"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Check, CircleCheck, KeyRound, MoreHorizontal, Pencil, ShieldOff, UserMinus, UserPlus, X } from "lucide-react";
import {
  decideEstimateRequest,
  removeStaff,
  resetStaffPassword,
  revokeEstimatePermission,
  updateStaff,
  type EditStaffState,
  type ResetPasswordState,
} from "./actions";
import { Menu } from "@/components/menu";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddStaffForm } from "./staff-forms";

// The owner's controls on the Staff tab (tickets 37, 46, 74). "use client"
// because they open, confirm and show results without a page reload.

type Dialog = "edit" | "password" | "remove" | null;

// Each staff card's ⋮ menu (ticket 74): Edit details, Reset password,
// Take back quotes, Remove. Each opens its own pop-up, so the card itself
// stays tidy. Quote permission is granted by approving their request.
export function StaffMenu({
  staffId,
  name,
  contact,
  openJobs,
  canReviseEstimate,
}: {
  staffId: string;
  name: string;
  contact: string;
  openJobs: number;
  canReviseEstimate: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const close = () => setDialog(null);

  function revoke() {
    startTransition(async () => {
      const result = await revokeEstimatePermission(staffId);
      toast(
        result.error
          ? { kind: "error", title: "Couldn't take it back", description: result.error, action: { label: "Try again", onClick: revoke } }
          : { title: `${name} can no longer revise quotes`, description: "They can ask again from their Account page." },
      );
    });
  }

  return (
    <>
      <Menu
        label={`Actions for ${name}`}
        align="end"
        triggerClassName={buttonVariants({ variant: "ghost", size: "icon", className: "size-9 text-muted-foreground" })}
        trigger={<MoreHorizontal className="size-4" aria-hidden />}
        items={[
          { label: "Edit details", icon: Pencil, onSelect: () => setDialog("edit") },
          { label: "Reset password", icon: KeyRound, onSelect: () => setDialog("password") },
          ...(canReviseEstimate ? [{ label: "Take back quotes", icon: ShieldOff, onSelect: revoke }] : []),
          { label: "Remove from shop", icon: UserMinus, onSelect: () => setDialog("remove") },
        ]}
      />
      <Modal
        open={dialog === "edit"}
        onClose={close}
        title={`Edit ${name}`}
        description="Their email and password are theirs to change, on their Account page."
      >
        <EditStaffForm staffId={staffId} name={name} contact={contact} onDone={close} />
      </Modal>
      <Modal
        open={dialog === "password"}
        onClose={close}
        title="Reset password"
        description={`For when ${name} forgets theirs. Nobody can see the old one: it's stored scrambled.`}
      >
        <ResetPasswordForm staffId={staffId} name={name} onDone={close} />
      </Modal>
      <Modal open={dialog === "remove"} onClose={close} title={`Remove ${name}?`}>
        <ConfirmRemove staffId={staffId} name={name} openJobs={openJobs} onCancel={close} />
      </Modal>
    </>
  );
}

// "Add staff" in the Staff header (ticket 74): the form in a pop-up,
// which closes with a toast once the account is made.
export function AddStaffButton() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        Add staff
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add staff" description="Create an account for someone who works in your shop." wide>
        <AddStaffForm
          onAdded={(who) => {
            setOpen(false);
            toast({ title: `${who} was added`, description: "Give them their email and temporary password." });
          }}
        />
      </Modal>
    </>
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
        <Button type="button" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`name-${staffId}`}>Name</Label>
        <Input id={`name-${staffId}`} name="display_name" defaultValue={name} maxLength={80} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`contact-${staffId}`}>Contact number</Label>
        <Input id={`contact-${staffId}`} name="contact_number" type="tel" defaultValue={contact} maxLength={40} required />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// A new temporary password for someone who forgot theirs (ticket 46).
// Typed as plain text so the owner can read it back to them; the old
// one is never shown, because nobody can read it.
function ResetPasswordForm({ staffId, name, onDone }: { staffId: string; name: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    resetStaffPassword.bind(null, staffId),
    {},
  );
  if (state.done && !pending) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p role="status" className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          <span>
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Password reset.</span> {name} has been
            signed out everywhere and can now sign in with the new password. Tell them to change it on their Account
            page.
          </span>
        </p>
        <Button type="button" variant="secondary" className="w-fit self-end" onClick={onDone}>
          Close
        </Button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`password-${staffId}`}>New temporary password</Label>
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
        <p className="text-xs text-muted-foreground">
          Their old password stops working and they&apos;re signed out on every device. Give them this one in person
          or by message.
        </p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onDone()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </div>
    </form>
  );
}

function ConfirmRemove({ staffId, name, openJobs, onCancel }: { staffId: string; name: string; openJobs: number; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">
        They can no longer sign in to your shop.
        {openJobs > 0 && ` Their ${openJobs} open repair${openJobs === 1 ? "" : "s"} move${openJobs === 1 ? "s" : ""} to you.`}{" "}
        Their name stays on past repairs. This can&apos;t be undone: to bring them back, add them again with a new email.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Keep {name}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await removeStaff(staffId);
              if (result.error) setError(result.error);
            })
          }
        >
          <UserMinus className="size-4" aria-hidden />
          {pending ? "Removing…" : "Remove"}
        </Button>
      </div>
    </div>
  );
}

// One waiting request: the reason, a note box, Approve and Reject. The
// answer shows straight away (ticket 76): the card turns into "Approved"
// or "Rejected" while the server saves; if saving fails, it comes back
// with the error.
export function RequestDecision({ requestId, staffName }: { requestId: string; staffName: string }) {
  const [note, setNote] = useState("");
  const [decided, setDecided] = useOptimistic<"approved" | "rejected" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const toast = useToast();

  function decide(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      setDecided(approve ? "approved" : "rejected");
      const result = await decideEstimateRequest(requestId, approve, note);
      if (result.error) {
        setError(result.error);
        toast({ kind: "error", title: "Couldn't save your answer", description: result.error, action: { label: "Try again", onClick: () => decide(approve) } });
      } else {
        toast({ title: approve ? `${staffName} can now revise quotes` : `Request from ${staffName} rejected` });
      }
    });
  }

  if (decided) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {decided === "approved" ? <Check className="size-4 text-primary" aria-hidden /> : <X className="size-4" aria-hidden />}
        {decided === "approved" ? "Approved" : "Rejected"}
        {pending && "…"}
      </p>
    );
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
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => decide(false)}>
          <X className="size-3.5" aria-hidden />
          Reject
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={() => decide(true)}>
          <Check className="size-3.5" aria-hidden />
          Approve
        </Button>
      </div>
    </div>
  );
}
