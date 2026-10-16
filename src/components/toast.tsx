"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CircleCheck, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toasts (ticket 67): small messages in the bottom corner that fade away
 * by themselves. One place for every "Saved", "Copied", "Status changed
 * — Undo", "Upload failed — Try again", and the live customer pop-ups.
 *
 *   const toast = useToast();
 *   toast({ title: "Part removed", action: { label: "Undo", onClick: putBack } });
 *   toast({ kind: "error", title: "Couldn't save", action: { label: "Try again", onClick: save } });
 *
 * The timer pauses while the pointer or keyboard is on a toast, so there
 * is time to press Undo. Screen readers hear each one without losing
 * their place (errors interrupt; the rest wait their turn).
 */

export type ToastKind = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  title: string;
  description?: string;
  kind?: ToastKind;
  // One button, e.g. Undo or Try again. Pressing it closes the toast.
  action?: { label: string; onClick: () => void };
  // A link, e.g. "Open the repair".
  link?: { href: string; label: string };
  // How long it stays, in ms. Longer when there is a button to press.
  duration?: number;
  icon?: LucideIcon;
};

type Toast = ToastOptions & { id: number; closing: boolean };

const MAX = 3;
const CLOSE_MS = 120; // the fade-out (--animate-menu-out)

const LOOK: Record<ToastKind, { icon: LucideIcon; tone: string; iconTone: string }> = {
  success: {
    icon: CircleCheck,
    tone: "border-emerald-300 dark:border-emerald-800",
    iconTone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  error: {
    icon: XCircle,
    tone: "border-red-300 dark:border-red-900",
    iconTone: "bg-red-50 text-destructive dark:bg-red-950",
  },
  warning: {
    icon: AlertTriangle,
    tone: "border-amber-300 dark:border-amber-800",
    iconTone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  info: {
    icon: Info,
    tone: "border-border",
    iconTone: "bg-muted text-tertiary",
  },
};

type ShowToast = (options: ToastOptions) => number;

const ToastContext = createContext<ShowToast | null>(null);

// Outside the provider (e.g. the customer page) toasts are simply skipped.
const NONE: ShowToast = () => 0;

export function useToast(): ShowToast {
  return useContext(ToastContext) ?? NONE;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), CLOSE_MS);
  }, []);

  const show = useCallback<ShowToast>((options) => {
    const id = nextId.current++;
    setToasts((all) => [...all.filter((t) => !t.closing).slice(-(MAX - 1)), { ...options, id, closing: false }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-[var(--toast-offset,1rem)] z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96 print:hidden"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const kind = toast.kind ?? "success";
  const look = LOOK[kind];
  const Icon = toast.icon ?? look.icon;
  const duration = toast.duration ?? (toast.action ? 8000 : kind === "error" ? 8000 : 4000);
  const [paused, setPaused] = useState(false);
  // Time left, kept across pauses.
  const left = useRef(duration);

  useEffect(() => {
    if (paused || toast.closing) return;
    const started = Date.now();
    const timer = window.setTimeout(onDismiss, left.current);
    return () => {
      window.clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [paused, toast.closing, onDismiss]);

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-[var(--radius)] border bg-card p-3 text-sm text-card-foreground shadow-xl",
        toast.closing ? "animate-menu-out" : "animate-menu-in",
        look.tone,
      )}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", look.iconTone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
        <p className="font-medium text-tertiary">{toast.title}</p>
        {toast.description && <p className="text-muted-foreground">{toast.description}</p>}
        {toast.link && (
          <Link
            href={toast.link.href}
            onClick={onDismiss}
            className="w-fit font-medium text-primary underline-offset-4 hover:underline"
          >
            {toast.link.label}
          </Link>
        )}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            onDismiss();
            toast.action!.onClick();
          }}
          className="h-8 shrink-0 self-center rounded-inner border border-border px-3 text-sm font-semibold text-primary hover:bg-muted"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
