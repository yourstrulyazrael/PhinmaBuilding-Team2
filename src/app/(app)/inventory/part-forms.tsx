"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, PackagePlus, Pencil, SlidersHorizontal } from "lucide-react";
import { addPart, editPart, recordMovement, setPartActive, type FormState } from "./actions";
import type { Part } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function Message({ state, pending }: { state: FormState; pending: boolean }) {
  if (state.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state.done && !pending) return <p role="status" className="text-sm text-primary">{state.done}</p>;
  return null;
}

// SKU, name, cost and low-stock level: shared by Add and Edit.
function PartFields({ part, cost }: { part?: Part; cost?: number }) {
  return (
    <>
      <Field label="SKU">
        <Input name="sku" defaultValue={part?.sku} maxLength={40} placeholder="e.g. LCD-IP12" required />
      </Field>
      <Field label="Name">
        <Input name="name" defaultValue={part?.name} maxLength={100} placeholder="e.g. iPhone 12 LCD screen" required />
      </Field>
      <Field label="Cost (₱)">
        <Input name="cost" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={cost ?? ""} placeholder="What the shop pays" required />
      </Field>
      <Field label="Low-stock level">
        <Input name="low_stock_at" type="number" inputMode="numeric" min={0} step={1} defaultValue={part?.low_stock_at ?? 2} required />
      </Field>
    </>
  );
}

// The owner adds a part to the catalog (ticket 27).
export function AddPartForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addPart, {});
  return (
    <form key={state.done ?? "new"} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PartFields />
        <Field label="Starting stock">
          <Input name="starting" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} required />
        </Field>
      </div>
      <Message state={state} pending={pending} />
      <Button type="submit" disabled={pending} className="w-fit">
        <PackagePlus className="mr-1.5 size-4" aria-hidden />
        {pending ? "Adding…" : "Add part"}
      </Button>
    </form>
  );
}

type Mode = "restock" | "adjust" | "edit";

// Restock / Adjust / Edit / Archive for one part (owner only).
export function PartActions({ part, cost }: { part: Part; cost: number }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (mode && !d.open) d.showModal();
    if (!mode && d.open) d.close();
  }, [mode]);

  const small = "h-8 px-2 text-xs";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {part.active && (
        <>
          <Button type="button" size="sm" variant="secondary" className={small} onClick={() => setMode("restock")}>
            <PackagePlus className="mr-1 size-3.5" aria-hidden />
            Restock
          </Button>
          <Button type="button" size="sm" variant="ghost" className={small} onClick={() => setMode("adjust")} aria-label={`Adjust ${part.name}`}>
            <SlidersHorizontal className="size-3.5" aria-hidden />
          </Button>
          <Button type="button" size="sm" variant="ghost" className={small} onClick={() => setMode("edit")} aria-label={`Edit ${part.name}`}>
            <Pencil className="size-3.5" aria-hidden />
          </Button>
        </>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={small}
        disabled={pending}
        onClick={() => startTransition(async () => void (await setPartActive(part.id, !part.active)))}
        aria-label={part.active ? `Archive ${part.name}` : `Bring back ${part.name}`}
        title={part.active ? "Archive: hide from pickers, keep history" : "Bring back"}
      >
        {part.active ? <Archive className="size-3.5" aria-hidden /> : <ArchiveRestore className="size-3.5" aria-hidden />}
      </Button>

      <dialog
        ref={dialog}
        onClose={() => setMode(null)}
        aria-label={mode ? `${mode === "edit" ? "Edit" : mode === "restock" ? "Restock" : "Adjust"} ${part.name}` : undefined}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-card p-0 text-left text-card-foreground shadow-xl backdrop:bg-black/40"
      >
        {mode === "edit" && <EditForm part={part} cost={cost} onDone={() => setMode(null)} />}
        {mode === "restock" && <MovementForm part={part} reason="restock" onDone={() => setMode(null)} />}
        {mode === "adjust" && <MovementForm part={part} reason="adjustment" onDone={() => setMode(null)} />}
      </dialog>
    </div>
  );
}

function EditForm({ part, cost, onDone }: { part: Part; cost: number; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(editPart.bind(null, part.id), {});
  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="flex flex-col gap-4 p-6">
      <h2 className="text-base font-semibold text-tertiary">Edit {part.name}</h2>
      <PartFields part={part} cost={cost} />
      <Message state={state} pending={pending} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

function MovementForm({ part, reason, onDone }: { part: Part; reason: "restock" | "adjustment"; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(recordMovement.bind(null, part.id, reason), {});
  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);
  const restock = reason === "restock";
  return (
    <form action={formAction} className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-base font-semibold text-tertiary">{restock ? "Restock" : "Adjust"} {part.name}</h2>
        <p className="text-sm text-muted-foreground">
          In stock now: {part.quantity}.{" "}
          {restock ? "How many arrived?" : "Use a minus for losses or breakage, e.g. -1; plus to correct a miscount."}
        </p>
      </div>
      <Field label={restock ? "Quantity added" : "Change (+ or −)"}>
        <Input name="amount" type="number" inputMode="numeric" step={1} min={restock ? 1 : undefined} required autoFocus />
      </Field>
      <Field label="Note (optional)">
        <Input name="note" maxLength={200} placeholder={restock ? "e.g. From supplier, receipt #123" : "e.g. Cracked during install"} />
      </Field>
      <Message state={state} pending={pending} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : restock ? "Add stock" : "Save adjustment"}</Button>
      </div>
    </form>
  );
}
