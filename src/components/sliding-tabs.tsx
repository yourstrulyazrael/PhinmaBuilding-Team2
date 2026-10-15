"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlidingTabItem = {
  key: string;
  href: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  extra?: React.ReactNode; // e.g. a count badge after the label
};

const LOOKS = {
  // Period picker: a green pill, white text on it.
  solid: {
    track: "border border-border bg-card p-1 shadow-xs",
    pill: "bg-primary shadow-sm shadow-primary/25",
    on: "text-primary-foreground",
    off: "text-muted-foreground hover:text-foreground",
  },
  // Workspace tabs: a recessed track, the open tab raised on a white tile.
  raised: {
    track: "border border-border/70 bg-muted/70 p-1",
    pill: "bg-card shadow-card",
    on: "text-primary",
    off: "text-muted-foreground hover:text-foreground",
  },
} as const;

/**
 * A row of options with ONE highlight that glides to the picked one
 * (ticket 53), instead of the colour jumping. It starts moving the moment
 * you tap, before the page has loaded the new data, so it feels instant.
 *
 * Each option is a link (the choice lives in the address, so refresh and
 * Back keep it). Before the page is interactive, the picked option is
 * simply coloured; once measured, the gliding highlight takes over. With
 * "reduce motion" on, it moves without the glide.
 */
export function SlidingTabs({
  items,
  active,
  label,
  look = "solid",
  stretch = false,
  className,
}: {
  items: SlidingTabItem[];
  active: string | null; // null: none picked (e.g. a month is chosen instead)
  label: string; // what the row is, for screen readers
  look?: keyof typeof LOOKS;
  stretch?: boolean; // full width on phones, options sharing the space
  className?: string;
}) {
  const style = LOOKS[look];
  const trackRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  // The option just tapped, shown at once; the address catches up after.
  const [picked, setPicked] = useState(active);
  const [shownActive, setShownActive] = useState(active);
  if (active !== shownActive) {
    setShownActive(active);
    setPicked(active);
  }
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // No glide for the very first placement, so it doesn't slide in from the edge.
  const [glide, setGlide] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const el = picked ? itemRefs.current.get(picked) : undefined;
      setBox(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    const ready = requestAnimationFrame(() => setGlide(true));
    // Re-measure when the row changes size (window resize, wrapping).
    const watch = new ResizeObserver(measure);
    watch.observe(track);
    return () => {
      cancelAnimationFrame(ready);
      watch.disconnect();
    };
  }, [picked, items.length]);

  return (
    <nav
      ref={trackRef}
      aria-label={label}
      className={cn(
        "relative inline-flex flex-wrap gap-1 rounded-[var(--radius)]",
        stretch && "w-full sm:w-fit",
        style.track,
        className,
      )}
    >
      {/* The gliding highlight. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 rounded-[calc(var(--radius)-4px)]",
          glide && "transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          style.pill,
          box ? "opacity-100" : "opacity-0",
        )}
        style={box ? { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` } : undefined}
      />
      {items.map(({ key, href, label: text, icon: Icon, extra }) => {
        const on = key === picked;
        return (
          <Link
            key={key}
            ref={(el) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            }}
            href={href}
            onClick={() => setPicked(key)}
            aria-current={key === active ? "page" : undefined}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-sm font-medium",
              "transition-colors duration-300 motion-reduce:transition-none",
              stretch && "flex-1 sm:flex-none",
              on ? style.on : style.off,
              // Until the highlight is measured, colour the picked one itself.
              on && !box && style.pill,
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {text}
            {extra}
          </Link>
        );
      })}
    </nav>
  );
}
