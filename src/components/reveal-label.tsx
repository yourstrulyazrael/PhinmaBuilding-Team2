import { cn } from "@/lib/utils";

/**
 * Icon-only square buttons in the top bar, with a small tooltip under
 * each one that names it when you point at it (or Tab to it with the
 * keyboard).
 *
 * Put `revealItem` on the link or button, and the name in <RevealLabel>.
 * The name is always in the page, just invisible until hover, so screen
 * readers still read it. On a phone (no hover) only the icon shows.
 */
export const revealItem =
  "group/reveal relative flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-medium md:size-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RevealLabel({
  children,
  shortcut,
  align = "center",
  className,
}: {
  children: React.ReactNode;
  shortcut?: string; // e.g. "Alt+4", shown faintly after the name
  align?: "center" | "end"; // "end" for buttons at the right edge, so the tooltip stays on screen
  className?: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-full z-30 mt-2 flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-card-foreground shadow-lg",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
        "-translate-y-1 opacity-0 transition-all duration-150 ease-out motion-reduce:transition-none",
        "group-hover/reveal:translate-y-0 group-hover/reveal:opacity-100",
        "group-focus-visible/reveal:translate-y-0 group-focus-visible/reveal:opacity-100",
        className,
      )}
    >
      {children}
      {shortcut && (
        <kbd className="font-sans font-medium text-muted-foreground" aria-hidden>
          {shortcut}
        </kbd>
      )}
    </span>
  );
}
