"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

/**
 * Copy something with one click (ticket 67/70), with a toast saying what
 * was copied, or "Try again" if the browser blocked the clipboard.
 */
export function useCopy() {
  const toast = useToast();
  return async function copy(text: string, what: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied`, icon: Copy, duration: 2500 });
      return true;
    } catch {
      toast({
        kind: "error",
        title: `Couldn't copy the ${what.toLowerCase()}`,
        description: "Your browser blocked the clipboard.",
        action: { label: "Try again", onClick: () => void copy(text, what) },
      });
      return false;
    }
  };
}

// A small copy icon to put next to a repair number, phone number or link.
// The icon turns into a ✓ for a moment after copying.
export function CopyButton({ text, what, className }: { text: string; what: string; className?: string }) {
  const copy = useCopy();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${what.toLowerCase()}`}
      title={`Copy ${what.toLowerCase()}`}
      onClick={async () => {
        if (await copy(text, what)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }
      }}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-inner text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {done ? <Check className="size-3.5 animate-pop text-primary" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
}
