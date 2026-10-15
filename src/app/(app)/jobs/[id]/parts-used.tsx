"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addJobPart, removeJobPart, type ActionResult } from "./actions";
import { formatPeso } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type UsedPart = { id: string; name: string; sku: string; quantity: number; unitPrice: number };
export type PickablePart = { id: string; name: string; sku: string; quantity: number; price: number };

/**
 * Parts used on this repair (ticket 28). Adding takes them out of stock;
 * removing one recorded by mistake puts it back. The customer sees the
 * names on their tracking page (never cost or SKU).
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
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(addJobPart.bind(null, jobId), {});
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string>();

  return (
    <div className="flex flex-col gap-4">
      {used.length === 0 ? (
        <p className="text-sm text-muted-foreground">No parts recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-[var(--radius)] border border-border">
          {used.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{u.name}</span>
                {u.quantity > 1 && <span className="text-muted-foreground"> ×{u.quantity}</span>}
                <span className="ml-2 font-mono text-xs text-muted-foreground">{u.sku}</span>
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground">{formatPeso(u.unitPrice * u.quantity)}</span>
              {editable && (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() =>
                    startRemove(async () => {
                      setRemoveError(undefined);
                      const result = await removeJobPart(u.id, jobId);
                      if (result.error) setRemoveError(result.error);
                    })
                  }
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
              {formatPeso(used.reduce((sum, u) => sum + u.unitPrice * u.quantity, 0))}
            </span>
          </li>
        </ul>
      )}
      {removeError && <p role="alert" className="text-sm text-destructive">{removeError}</p>}

      {editable &&
        (parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parts in the catalog yet. The owner adds them in Inventory.</p>
        ) : (
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium">
              Part
              <select
                name="part_id"
                required
                defaultValue=""
                className="h-10 rounded-[var(--radius)] border border-input bg-background px-3 text-base md:text-sm"
              >
                <option value="" disabled>
                  Choose a part…
                </option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) · {formatPeso(p.price)} · {p.quantity} in stock
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-24 flex-col gap-1.5 text-sm font-medium">
              Quantity
              <Input name="quantity" type="number" inputMode="numeric" min={1} max={99} step={1} defaultValue={1} required />
            </label>
            <Button type="submit" disabled={pending}>
              <Plus className="mr-1.5 size-4" aria-hidden />
              {pending ? "Adding…" : "Add"}
            </Button>
          </form>
        ))}
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
