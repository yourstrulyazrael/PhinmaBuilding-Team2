"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/copy-button";

// Copies the update message to the clipboard, then shows "Copied" for
// a couple of seconds (and a toast, ticket 67) so the technician knows
// it worked. If the browser blocks it, the toast offers "Try again".
export function CopyMessageButton({ message, label = "Copy update message" }: { message: string; label?: string }) {
  const copy = useCopy();
  const [copied, setCopied] = useState(false);

  async function onClick() {
    if (await copy(message, "Message")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick} className="w-fit">
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
