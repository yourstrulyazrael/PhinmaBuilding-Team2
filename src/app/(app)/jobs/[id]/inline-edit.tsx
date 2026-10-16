"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { updateJobField, type EditableField } from "./actions";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/**
 * Click the pencil, change the text, press Enter (ticket 70). Esc or ✕
 * cancels. The new value shows straight away; a toast confirms it with
 * Undo, or offers Try again if it didn't save.
 *
 * `display` is how the saved value looks (e.g. a formatted date); while
 * editing or saving, the raw value is shown instead.
 */
export function InlineEdit({
  jobId,
  field,
  value,
  label,
  display,
  canEdit,
  multiline = false,
  type = "text",
  maxLength,
  className,
  inputClassName,
}: {
  jobId: string;
  field: EditableField;
  value: string;
  label: string; // e.g. "device", for the button and messages
  display?: React.ReactNode;
  canEdit: boolean;
  multiline?: boolean;
  type?: "text" | "tel" | "date";
  maxLength?: number;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // What to show while saving, before the page catches up.
  const [shown, setShown] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const box = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const toast = useToast();

  // The page caught up with the saved value.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setShown(null);
  }

  useEffect(() => {
    if (editing) {
      box.current?.focus();
      if (type !== "date") box.current?.select();
    }
  }, [editing, type]);

  function save(next: string, before: string, isUndo = false) {
    setError(undefined);
    setShown(next);
    startTransition(async () => {
      const result = await updateJobField(jobId, field, next);
      if (result.error) {
        setShown(null);
        setError(result.error);
        toast({
          kind: "error",
          title: `Couldn't save the ${label}`,
          description: result.error,
          action: { label: "Try again", onClick: () => save(next, before, isUndo) },
        });
        return;
      }
      toast(
        isUndo
          ? { title: `${capital(label)} put back` }
          : { title: `${capital(label)} saved`, action: { label: "Undo", onClick: () => save(before, next, true) } },
      );
    });
  }

  function submit() {
    const next = draft.trim();
    setEditing(false);
    if (next === value.trim()) return;
    save(next, value);
  }

  if (editing) {
    const common = {
      ref: box,
      value: draft,
      maxLength,
      "aria-label": capital(label),
      onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setDraft(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        } else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submit();
        }
      },
      className: cn(
        "w-full rounded-inner border border-ring bg-card px-2 py-1 text-base text-foreground shadow-xs outline-none ring-4 ring-ring/20 md:text-sm",
        inputClassName,
      ),
    };
    return (
      <span className={cn("flex w-full items-start gap-1", className)}>
        {multiline ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
        <button type="button" onClick={submit} aria-label="Save" title="Save (Enter)" className="flex size-8 shrink-0 items-center justify-center rounded-inner text-primary hover:bg-muted">
          <Check className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" title="Cancel (Esc)" className="flex size-8 shrink-0 items-center justify-center rounded-inner text-muted-foreground hover:bg-muted">
          <X className="size-4" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span className={cn("group/edit inline-flex max-w-full flex-col", className)}>
      <span className="inline-flex max-w-full items-center gap-1.5">
        <span className={cn("min-w-0", pending && "opacity-60")}>{shown ?? display ?? value}</span>
        {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Saving" />}
        {canEdit && !pending && (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setError(undefined);
              setEditing(true);
            }}
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-inner text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground hover:opacity-100 group-hover/edit:opacity-100 focus-visible:opacity-100"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        )}
      </span>
      {error && (
        <span role="alert" className="text-xs font-normal text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
