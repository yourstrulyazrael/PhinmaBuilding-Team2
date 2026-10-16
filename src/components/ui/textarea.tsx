import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-base shadow-xs transition-[border-color,box-shadow] duration-150 md:text-sm",
        "placeholder:text-muted-foreground hover:border-ring/40",
        // Ticket 48: a soft green glow and border on focus.
        "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Ticket 75: a field with an error gets a red outline.
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
