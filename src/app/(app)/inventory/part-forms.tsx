"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Archive, ArchiveRestore, EllipsisVertical, PackagePlus, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { addPart, editPart, recordMovement, setPartActive, type FormState } from "./actions";
import type { Part } from "@/lib/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu } from "@/components/menu";
import { Modal } from "@/components/modal";

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

// The categories already in use, offered as suggestions in the Category
// box (ticket 32). Rendered once on the page.
export function CategoryList({ categories }: { categories: string[] }) {
  return (
    <datalist id="part-categories">
      {categories.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}

// SKU, name, category, prices and low-stock level: shared by Add and Edit.
function PartFields({ part, cost }: { part?: Part; cost?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name">
        <Input name="name" defaultValue={part?.name} maxLength={100} placeholder="e.g. iPhone 12 LCD screen" required autoFocus />
      </Field>
      <Field label="SKU">
        <Input name="sku" defaultValue={part?.sku} maxLength={40} placeholder="e.g. LCD-IP12" required />
      </Field>
      <Field label="Category">
        <Input name="category" list="part-categories" defaultValue={part?.category ?? ""} maxLength={50} placeholder="e.g. Screens" />
      </Field>
      <Field label="Low-stock level">
        <Input name="low_stock_at" type="number" inputMode="numeric" min={0} step={1} defaultValue={part?.low_stock_at ?? 2} required />
      </Field>
      <Field label="Cost (₱): what the shop pays">
        <Input name="cost" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={cost ?? ""} required />
      </Field>
      <Field label="Retail price (₱): what the customer pays">
        <Input name="retail_price" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={part?.retail_price ?? ""} required />
      </Field>
    </div>
  );
}

// "Add part" in the page header (owner), opening a pop-up form.
export function AddPartButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" aria-hidden />
        Add part
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a part" description="The cost is only ever shown to you.">
        <AddPartForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function AddPartForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addPart, {});
  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PartFields />
      <Field label="Starting stock">
        <Input name="starting" type="number" inputMode="numeric" min={0} step={1} defaultValue={0} required className="w-32" />
      </Field>
      <Message state={state} pending={pending} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          <PackagePlus className="mr-1.5 size-4" aria-hidden />
          {pending ? "Adding…" : "Add part"}
        </Button>
      </div>
    </form>
  );
}

type Mode = "restock" | "adjust" | "edit";

// The ⋮ menu (Restock, Adjust, Edit) and Archive on a table row (owner).
export function PartRowActions({ part, cost }: { part: Part; cost: number }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, startTransition] = useTransition();
  const close = () => setMode(null);
  const icon = "flex size-8 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="flex items-center justify-end gap-1">
      {part.active && (
        <Menu
          label={`Actions for ${part.name}`}
          triggerClassName={icon}
          trigger={<EllipsisVertical className="size-4" aria-hidden />}
          items={[
            { label: "Restock", icon: PackagePlus, onSelect: () => setMode("restock") },
            { label: "Adjust stock", icon: SlidersHorizontal, onSelect: () => setMode("adjust") },
            { label: "Edit details", icon: Pencil, onSelect: () => setMode("edit") },
          ]}
        />
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await setPartActive(part.id, !part.active)))}
        aria-label={part.active ? `Archive ${part.name}` : `Bring back ${part.name}`}
        title={part.active ? "Archive: hide from pickers, keep its history" : "Bring back"}
        className={`${icon} hover:text-destructive disabled:opacity-50`}
      >
        {part.active ? <Archive className="size-4" aria-hidden /> : <ArchiveRestore className="size-4" aria-hidden />}
      </button>

      <Modal
        open={mode !== null}
        onClose={close}
        title={mode === "edit" ? `Edit ${part.name}` : mode === "restock" ? `Restock ${part.name}` : `Adjust ${part.name}`}
        description={
          mode === "edit"
            ? undefined
            : mode === "restock"
              ? `In stock now: ${part.quantity}. How many arrived?`
              : `In stock now: ${part.quantity}. Use a minus for losses or breakage (e.g. -1), a plus to correct a miscount.`
        }
      >
        {mode === "edit" && <EditForm part={part} cost={cost} onDone={close} />}
        {mode === "restock" && <MovementForm part={part} reason="restock" onDone={close} />}
        {mode === "adjust" && <MovementForm part={part} reason="adjustment" onDone={close} />}
      </Modal>
    </div>
  );
}

function EditForm({ part, cost, onDone }: { part: Part; cost: number; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(editPart.bind(null, part.id), {});
  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="flex flex-col gap-4">
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
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={restock ? "Quantity added" : "Change (+ or −)"}>
        <Input name="amount" type="number" inputMode="numeric" step={1} min={restock ? 1 : undefined} required autoFocus className="w-40" />
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
