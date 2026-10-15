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

// The glide: about 0.4 s with a soft, iOS-like ease (fast start, long
// gentle settle). The text colours change on the same curve, so a label
// turns white as the pill arrives under it.
export const GLIDE_MS = 420;
export const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * A row of options with ONE highlight that glides to the picked one
 * (tickets 53–54), instead of the colour jumping. It starts moving the
 * moment you tap, before the page has loaded the new data.
 *
 * Smoothness ("FLIP"): the pill is put at its new place and size at
 * once, then drawn as if it were still at the old one using only a
 * transform (move + stretch), and that transform is animated away.
 * Transforms run on the graphics card, separate from the page's work,
 * so the glide doesn't stutter while React draws the new data. A second
 * tap mid-glide starts from wherever the pill is, without a jump.
 *
 * Each option is a link (the choice lives in the address, so refresh and
 * Back keep it). Before the page is interactive, the picked option is
 * simply coloured. With "reduce motion" on, it moves without the glide.
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
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  // The option just tapped, shown at once; the address catches up after.
  const [picked, setPicked] = useState(active);
  const [shownActive, setShownActive] = useState(active);
  if (active !== shownActive) {
    setShownActive(active);
    setPicked(active);
  }
  // Has the pill been placed yet? (Until then the option colours itself.)
  const [placed, setPlaced] = useState(false);

  // Put the pill on `picked`; glide there if it was already showing.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const el = picked ? itemRefs.current.get(picked) : undefined;
    if (!pill) return;
    if (!el) {
      pill.style.opacity = "0";
      return;
    }

    const wasShowing = pill.style.opacity === "1";
    // Where it is on screen right now, mid-glide included.
    const from = wasShowing ? pill.getBoundingClientRect() : null;
    pill.getAnimations().forEach((a) => a.cancel());

    // Final place and size, for real.
    const x = el.offsetLeft;
    const y = el.offsetTop;
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.height = `${el.offsetHeight}px`;
    pill.style.transform = `translate(${x}px, ${y}px)`;
    pill.style.opacity = "1";
    setPlaced(true);

    if (!from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = pill.getBoundingClientRect();
    if (Math.abs(from.left - to.left) < 0.5 && Math.abs(from.width - to.width) < 0.5) return;

    // Start drawn at the old place and width, then let it go.
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    pill.animate(
      [
        { transform: `translate(${x + dx}px, ${y + dy}px) scale(${sx}, ${sy})` },
        { transform: `translate(${x}px, ${y}px) scale(1, 1)` },
      ],
      { duration: GLIDE_MS, easing: EASE },
    );
  }, [picked]);

  // Window resized or the row wrapped: re-place without a glide.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const watch = new ResizeObserver(() => {
      const pill = pillRef.current;
      const el = picked ? itemRefs.current.get(picked) : undefined;
      if (!pill || !el || pill.getAnimations().length > 0) return;
      pill.style.width = `${el.offsetWidth}px`;
      pill.style.height = `${el.offsetHeight}px`;
      pill.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    });
    watch.observe(track);
    return () => watch.disconnect();
  }, [picked]);

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
      {/* The gliding highlight: placed and animated from the code above. */}
      <span
        ref={pillRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 rounded-[calc(var(--radius)-4px)] opacity-0 will-change-transform [transform-origin:0_0]",
          style.pill,
        )}
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
            // Same page, new option: stay where you are, don't jump to the top.
            scroll={false}
            aria-current={key === active ? "page" : undefined}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-sm font-medium",
              "transition-colors duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              stretch && "flex-1 sm:flex-none",
              on ? style.on : style.off,
              // Until the highlight is measured, colour the picked one itself.
              on && !placed && style.pill,
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
