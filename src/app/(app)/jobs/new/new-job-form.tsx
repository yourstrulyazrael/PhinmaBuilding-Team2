"use client";

import { useMoney } from "@/components/currency";

import { useActionState, useEffect, useRef, useState } from "react";
import { FileClock, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { createJob, type NewJobState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The draft (ticket 71): what's typed so far, kept in this browser only,
// so a refresh, a dropped connection or a wrong click doesn't lose it.
// Removed as soon as the repair is saved, or with Discard.
const DRAFT_KEY = "zenith.draft.new-repair";
const FIELDS = ["customer_name", "customer_phone", "device", "initial_quote", "problem", "promised_date"] as const;
type Draft = { values: Partial<Record<(typeof FIELDS)[number], string>>; savedAt: number };

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const draft = raw ? (JSON.parse(raw) as Draft) : null;
    return draft && Object.values(draft.values).some((v) => v?.trim()) ? draft : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft && Object.values(draft.values).some((v) => v?.trim())) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private browsing can block storage: the form still works, just no draft.
  }
}

export function NewJobForm({ today }: { today: string }) {
  const { symbol } = useMoney();
  const [state, formAction, pending] = useActionState<NewJobState, FormData>(createJob, {});
  const form = useRef<HTMLFormElement>(null);
  const toast = useToast();
  // "restored" = a draft from earlier was put back; "saved" = typing is being kept.
  const [note, setNote] = useState<{ kind: "restored" | "saved"; at: number } | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  // The draft while the form is being sent; put back if saving fails.
  const sending = useRef<Draft | null>(null);

  function fill(values: Draft["values"]) {
    const el = form.current;
    if (!el) return;
    for (const name of FIELDS) {
      const input = el.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) input.value = values[name] ?? "";
    }
  }

  function current(): Draft {
    const data = new FormData(form.current ?? undefined);
    return { values: Object.fromEntries(FIELDS.map((f) => [f, String(data.get(f) ?? "")])), savedAt: Date.now() };
  }

  // Put back an earlier draft when the form opens.
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    fill(draft.values);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser's saved draft once
    setNote({ kind: "restored", at: draft.savedAt });
  }, []);

  // Saving failed: the form was cleared, so refill it and keep the draft.
  useEffect(() => {
    if (!state.error || !sending.current) return;
    fill(sending.current.values);
    writeDraft(sending.current);
    sending.current = null;
  }, [state]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  // Keep what's typed, a moment after typing stops.
  function onInput() {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const draft = current();
      writeDraft(draft);
      setNote(readDraft() ? { kind: "saved", at: draft.savedAt } : null);
    }, 400);
  }

  function discard() {
    const before = readDraft() ?? current();
    window.clearTimeout(saveTimer.current);
    writeDraft(null);
    fill({});
    setNote(null);
    toast({
      title: "Draft discarded",
      action: {
        label: "Undo",
        onClick: () => {
          writeDraft(before);
          fill(before.values);
          setNote({ kind: "restored", at: before.savedAt });
        },
      },
    });
  }

  return (
    <form
      ref={form}
      action={formAction}
      onInput={onInput}
      onSubmit={() => {
        // Sent: the draft is done with, unless saving fails (see above).
        window.clearTimeout(saveTimer.current);
        sending.current = current();
        writeDraft(null);
        setNote(null);
      }}
      className="flex flex-col gap-5"
    >
      {note?.kind === "restored" && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-highlight/30 bg-highlight/5 px-4 py-3 text-sm"
        >
          <FileClock className="size-4 text-highlight" aria-hidden />
          <span className="flex-1">Picked up where you left off: your draft from {when(note.at)} is back.</span>
          <Button type="button" variant="ghost" size="sm" onClick={discard}>
            <Trash2 className="size-4" aria-hidden />
            Discard draft
          </Button>
        </div>
      )}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-tertiary">Customer</legend>
        <Field label="Customer name" name="customer_name" maxLength={100} autoComplete="off" placeholder="e.g. Juan Dela Cruz" />
        <Field
          label="Customer Contact No."
          name="customer_phone"
          type="tel"
          inputMode="tel"
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. 0917 123 4567"
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-tertiary">Repair</legend>
        <Field label="Device" name="device" maxLength={100} placeholder="e.g. iPhone 12" />
        <Field
          label={`Initial quote (${symbol})`}
          name="initial_quote"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="e.g. 1500"
        />
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="problem">Problem</Label>
          <Textarea
            id="problem"
            name="problem"
            maxLength={500}
            rows={3}
            placeholder="e.g. Cracked screen, touch still works"
            required
          />
        </div>
        <Field label="Estimated completion date" name="promised_date" type="date" min={today} />
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {note?.kind === "saved" && (
          <span className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
            Draft saved on this device
            <button type="button" onClick={discard} className="font-medium text-primary underline-offset-4 hover:underline">
              Discard
            </button>
          </span>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save repair"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  );
}

// "5 min ago", "yesterday at 3:10 PM"…
function when(at: number) {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}
