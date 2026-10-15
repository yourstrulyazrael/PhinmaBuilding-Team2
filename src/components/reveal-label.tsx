import { cn } from "@/lib/utils";

/**
 * Icon-only buttons in the top bar that slide their name out when you
 * point at them (or Tab to them with the keyboard).
 *
 * Put `revealItem` on the link or button, and the name in <RevealLabel>.
 * The name is always in the page, just squeezed to zero width, so screen
 * readers still read it. On a phone (no hover) only the icon shows.
 */
export const revealItem =
  "group/reveal flex h-9 shrink-0 items-center rounded-[var(--radius)] px-2 text-sm sm:px-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RevealLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out motion-reduce:transition-none",
        "group-hover/reveal:ml-2 group-hover/reveal:max-w-40 group-hover/reveal:opacity-100",
        "group-focus-visible/reveal:ml-2 group-focus-visible/reveal:max-w-40 group-focus-visible/reveal:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}
