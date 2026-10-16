import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-base shadow-xs transition-[border-color,box-shadow] duration-150 md:text-sm",
        "placeholder:text-muted-foreground",
        // Ticket 48: a soft green glow and border on focus.
        "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
