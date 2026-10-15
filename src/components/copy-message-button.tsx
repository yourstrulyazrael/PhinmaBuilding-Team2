"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copies the update message to the clipboard, then shows "Copied" for
// a couple of seconds so the technician knows it worked.
export function CopyMessageButton({ message }: { message: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {state === "copied" ? (
          <Check className="mr-1.5 size-4" aria-hidden />
        ) : (
          <Copy className="mr-1.5 size-4" aria-hidden />
        )}
        {state === "copied" ? "Copied" : "Copy update message"}
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {state === "failed" && "Couldn't copy. Your browser blocked the clipboard."}
      </p>
    </div>
  );
}
