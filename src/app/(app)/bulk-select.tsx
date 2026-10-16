"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2, UserRoundCog, X } from "lucide-react";
import { Menu } from "@/components/menu";
import { useToast } from "@/components/toast";
import { buttonVariants } from "@/components/ui/button";
import { STATUSES, type Status } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { bulkReassign, bulkSetStatus } from "./bulk-actions";

/**
 * Bulk actions on the Overview list (ticket 71): tick several repairs,
 * then change their status or (the owner) hand them to someone, in one
 * go. A toast confirms with Undo, which puts each repair back how it was.
 *
 * Only repairs you may change get a tick box, and only open ones (a
 * pickup needs a payment each; cancelling asks each time).
 */

export type Selectable = { id: string; status: Status; handledBy: string };

type Ctx = {
  selected: Set<string>;
  toggle: (id: string) => void;
  setAll: (on: boolean) => void;
  ids: string[];
};

const BulkContext = createContext<Ctx | null>(null);

const BULK_STATUSES = STATUSES.filter((s) => !["picked_up", "cancelled", "warranty"].includes(s.value));
const labelOf = (s: string) => STATUSES.find((x) => x.value === s)?.label ?? s;

export function BulkProvider({
  jobs,
  people,
  children,
}: {
  jobs: Selectable[];
  people: { id: string; name: string }[] | null; // null: not the owner, no reassigning
  children: React.ReactNode;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const ids = useMemo(() => jobs.map((j) => j.id), [jobs]);
  // Only what's on screen now counts (after a tab change or a search).
  const selected = useMemo(() => new Set([...picked].filter((id) => ids.includes(id))), [picked, ids]);

  const value: Ctx = {
    selected,
    ids,
    toggle: (id) =>
      setPicked((all) => {
        const next = new Set(all);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on) => setPicked(on ? new Set(ids) : new Set()),
  };

  return (
    <BulkContext.Provider value={value}>
      {children}
      <BulkBar jobs={jobs.filter((j) => selected.has(j.id))} people={people} onDone={() => setPicked(new Set())} />
    </BulkContext.Provider>
  );
}

// The tick box on one repair.
export function SelectBox({ id, label }: { id: string; label: string }) {
  const ctx = useContext(BulkContext);
  if (!ctx || !ctx.ids.includes(id)) return <span className="inline-block size-4" aria-hidden />;
  return (
    <input
      type="checkbox"
      checked={ctx.selected.has(id)}
      onChange={() => ctx.toggle(id)}
      aria-label={`Select ${label}`}
      className="size-4 shrink-0 accent-[var(--primary)]"
    />
  );
}

// "Select all" at the top of the table.
export function SelectAll() {
  const ctx = useContext(BulkContext);
  if (!ctx || ctx.ids.length === 0) return null;
  const all = ctx.selected.size === ctx.ids.length;
  return (
    <input
      type="checkbox"
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = ctx.selected.size > 0 && !all;
      }}
      onChange={() => ctx.setAll(!all)}
      aria-label={all ? "Unselect all" : "Select all you can change"}
      className="size-4 accent-[var(--primary)]"
    />
  );
}

function BulkBar({
  jobs,
  people,
  onDone,
}: {
  jobs: Selectable[];
  people: { id: string; name: string }[] | null;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const count = jobs.length;
  const show = count > 0;

  // Toasts move up while the bar is showing.
  useEffect(() => {
    const root = document.documentElement;
    if (show) root.style.setProperty("--toast-offset", "5.5rem");
    else root.style.removeProperty("--toast-offset");
    return () => {
      root.style.removeProperty("--toast-offset");
    };
  }, [show]);

  const plural = (n: number) => `${n} repair${n === 1 ? "" : "s"}`;

  // Puts each repair back as it was: grouped by its old value, one call each.
  function restore(groups: Map<string, string[]>, run: (ids: string[], to: string) => Promise<{ error?: string }>) {
    startTransition(async () => {
      const results = await Promise.all([...groups].map(([to, ids]) => run(ids, to)));
      const failed = results.find((r) => r.error);
      toast(failed ? { kind: "error", title: "Couldn't undo all of them", description: failed.error } : { title: "Undone" });
    });
  }

  function group(pick: (j: Selectable) => string) {
    const groups = new Map<string, string[]>();
    for (const j of jobs) groups.set(pick(j), [...(groups.get(pick(j)) ?? []), j.id]);
    return groups;
  }

  function setStatus(status: Status) {
    const before = group((j) => j.status);
    const ids = jobs.map((j) => j.id);
    startTransition(async () => {
      const result = await bulkSetStatus(ids, status);
      if (result.error) {
        toast({ kind: "error", title: "Couldn't change the status", description: result.error, action: { label: "Try again", onClick: () => setStatus(status) } });
        return;
      }
      onDone();
      toast({
        title: `${plural(result.changed ?? 0)} set to ${labelOf(status)}`,
        description: result.changed !== ids.length ? `${ids.length - (result.changed ?? 0)} couldn't be changed.` : undefined,
        action: { label: "Undo", onClick: () => restore(before, bulkSetStatus) },
      });
    });
  }

  function reassign(to: { id: string; name: string }) {
    const before = group((j) => j.handledBy);
    const ids = jobs.map((j) => j.id);
    startTransition(async () => {
      const result = await bulkReassign(ids, to.id);
      if (result.error) {
        toast({ kind: "error", title: "Couldn't reassign", description: result.error, action: { label: "Try again", onClick: () => reassign(to) } });
        return;
      }
      onDone();
      toast({
        title: `${plural(result.changed ?? 0)} handed to ${to.name}`,
        action: { label: "Undo", onClick: () => restore(before, (ids, back) => bulkReassign(ids, back)) },
      });
    });
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] print:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 shadow-2xl">
        <span className="flex items-center gap-2 px-1 text-sm font-medium" aria-live="polite">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
          {count} selected
        </span>
        <Menu
          label="Change status of the selected repairs"
          align="start"
          triggerClassName={buttonVariants({ size: "sm" })}
          trigger={
            <>
              Change status
              <ChevronDown className="size-4" aria-hidden />
            </>
          }
          items={BULK_STATUSES.map((s) => ({ label: s.label, onSelect: () => setStatus(s.value) }))}
        />
        {people && people.length > 1 && (
          <Menu
            label="Hand the selected repairs to"
            align="start"
            triggerClassName={buttonVariants({ variant: "secondary", size: "sm" })}
            trigger={
              <>
                <UserRoundCog className="size-4" aria-hidden />
                Reassign
                <ChevronDown className="size-4" aria-hidden />
              </>
            }
            items={people.map((p) => ({ label: p.name, onSelect: () => reassign(p) }))}
          />
        )}
        <button
          type="button"
          onClick={onDone}
          aria-label="Clear selection"
          className="flex size-8 items-center justify-center rounded-inner text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
