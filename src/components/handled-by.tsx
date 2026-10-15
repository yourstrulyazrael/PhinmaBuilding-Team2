import type { Viewer } from "@/lib/people";
import { cn } from "@/lib/utils";

// "Handled by" at a glance: initials and name, or "You" for your own
// jobs, so nobody wonders whose phone it is (ticket 13).
export function HandledBy({ id, viewer, className }: { id: string; viewer: Viewer; className?: string }) {
  const mine = id === viewer.id;
  const name = viewer.names[id] ?? "Someone";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`Handled by ${name}`}>
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
          mine ? "bg-primary text-primary-foreground" : "bg-tertiary text-tertiary-foreground",
        )}
      >
        {initials || "?"}
      </span>
      <span className={cn("truncate", mine && "font-medium text-primary")}>
        <span className="sr-only">Handled by </span>
        {mine ? "You" : name}
      </span>
    </span>
  );
}
