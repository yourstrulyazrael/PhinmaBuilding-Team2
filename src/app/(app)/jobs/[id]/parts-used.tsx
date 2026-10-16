"use client";

import { useMoney } from "@/components/currency";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addJobPart, removeJobPart, type ActionResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";

// pending: shown before the server has saved it (ticket 76).
export type UsedPart = { id: string; partId: string; name: string; sku: string; quantity: number; unitPrice: number; pending?: boolean };

type Change = { type: "remove"; id: string } | { type: "add"; part: UsedPart };
export type PickablePart = { id: string; name: string; sku: string; quantity: number; price: number };

/**
 * Parts used on this repair (ticket 28). Adding takes them out of stock;
 * removing one recorded by mistake puts it back. The customer sees the
 * names on their tracking page (never cost or SKU).
 *
 * Toasts (ticket 67): "Part added"; after removing, "Undo" records it
 * again (taking it back out of stock); a failed removal offers "Try again".
 *
 * Optimistic (ticket 76): an added part appears at once (faded until
 * saved) and a removed one disappears at once. If the server says no,
 * the list snaps back and the error shows.
 */
export function PartsUsed({
  jobId,
  used,
  parts,
  editable,
}: {
  jobId: string;
  used: UsedPart[];
  parts: PickablePart[];
  editable: boolean;
}) {
  const { money } = useMoney();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(addJobPart.bind(null, jobId), {});
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string>();
  const toast = useToast();
  const [list, change] = useOptimistic(used, (current: UsedPart[], c: Change) =>
    c.type === "remove" ? current.filter((u) => u.id !== c.id) : [...current, c.part],
  );

  // Show the new part straight away, then send the form.
  function add(data: FormData) {
    const part = parts.find((p) => p.id === data.get("part_id"));
    const quantity = Number(data.get("quantity"));
    if (part && Number.isInteger(quantity) && quantity > 0) {
      change({
        type: "add",
        part: { id: `pending-${part.id}`, partId: part.id, name: part.name, sku: part.sku, quantity, unitPrice: part.price, pending: true },
      });
    }
    formAction(data);
  }

  // A toast each time the Add form saves.
  const shown = useRef(state);
  useEffect(() => {
    if (state === shown.current) return;
    shown.current = state;
    if (state.saved) toast({ title: "Part added", description: "Taken out of stock." });
  }, [state, toast]);

  function remove(u: UsedPart) {
    startRemove(async () => {
      setRemoveError(undefined);
      change({ type: "remove", id: u.id });
      const result = await removeJobPart(u.id, jobId);
      if (result.error) {
        setRemoveError(result.error);
        toast({ kind: "error", title: `Couldn't remove ${u.name}`, action: { label: "Try again", onClick: () => remove(u) } });
        return;
      }
      toast({
        title: `${u.name} removed`,
        description: "Put back in stock.",
        action: { label: "Undo", onClick: () => putBack(u) },
      });
    });
  }

  function putBack(u: UsedPart) {
    startRemove(async () => {
      const form = new FormData();
      form.set("part_id", u.partId);
      form.set("quantity", String(u.quantity));
      const result = await addJobPart(jobId, {}, form);
      if (result.error) toast({ kind: "error", title: `Couldn't put ${u.name} back`, description: result.error });
      else toast({ title: `${u.name} recorded again` });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parts recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-[var(--radius)] border border-border">
          {list.map((u) => (
            <li key={u.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${u.pending ? "opacity-60" : ""}`}>
              <span>
                <span className="font-medium">{u.name}</span>
                {u.quantity > 1 && <span className="text-muted-foreground"> ×{u.quantity}</span>}
                <span className="ml-2 font-mono text-xs text-muted-foreground">{u.sku}</span>
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground">{money(u.unitPrice * u.quantity)}</span>
              {editable && !u.pending && (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => remove(u)}
                  aria-label={`Remove ${u.name} (puts it back in stock)`}
                  title="Remove (puts it back in stock)"
                  className="flex size-7 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 bg-muted/50 px-3 py-2 text-sm">
            <span className="font-medium">Parts total</span>
            <span className="font-semibold tabular-nums">
              {money(list.reduce((sum, u) => sum + u.unitPrice * u.quantity, 0))}
            </span>
          </li>
        </ul>
      )}
      {removeError && <p role="alert" className="text-sm text-destructive">{removeError}</p>}

      {editable &&
        (parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parts in the catalog yet. The owner adds them in Inventory.</p>
        ) : (
          <form action={add} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium">
              Part
              <select
                name="part_id"
                required
                defaultValue=""
                className="h-10 rounded-[var(--radius)] border border-input bg-card px-3 text-base shadow-xs transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 md:text-sm"
              >
                <option value="" disabled>
                  Choose a part…
                </option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) · {money(p.price)} · {p.quantity} in stock
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-24 flex-col gap-1.5 text-sm font-medium">
              Quantity
              <Input name="quantity" type="number" inputMode="numeric" min={1} max={99} step={1} defaultValue={1} required />
            </label>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" aria-hidden />
              {pending ? "Adding…" : "Add"}
            </Button>
          </form>
        ))}
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
