"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  // For a pick-one menu (e.g. the theme): the current choice gets a ✓.
  checked?: boolean;
};

const CLOSE_MS = 120; // the fade-out (matches --animate-menu-out)

const WIDTH = 192; // px

/**
 * A small dropdown menu (the ⋮ on a table row, or Export ▾). Uses fixed
 * positioning so a table card can't cut it off, opens upwards near the
 * bottom of the screen, and works with the keyboard (↑ ↓ Enter Esc).
 * It drops in when it opens and fades out when it closes (ticket 65).
 */
export function Menu({
  label,
  trigger,
  items,
  triggerClassName,
  align = "end",
}: {
  label: string; // what screen readers hear for the button
  trigger: React.ReactNode;
  items: MenuItem[];
  triggerClassName?: string;
  align?: "start" | "end";
}) {
  const [open, setOpenNow] = useState(false);
  // Still drawn for a moment after closing, so it can fade out.
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  // Only ever called to close an open menu, or to open a closed one.
  const setOpen = useCallback((next: boolean) => {
    window.clearTimeout(closeTimer.current);
    if (next) {
      setClosing(false);
      setOpenNow(true);
      return;
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClosing(true);
      closeTimer.current = window.setTimeout(() => setClosing(false), CLOSE_MS);
    }
    setOpenNow(false);
  }, []);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  function show() {
    const rect = button.current!.getBoundingClientRect();
    const height = items.length * 38 + 8;
    const below = rect.bottom + 4 + height <= window.innerHeight;
    const left = align === "end" ? rect.right - WIDTH : rect.left;
    setPos({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height),
      left: Math.max(8, Math.min(left, window.innerWidth - WIDTH - 8)),
    });
    // Start on the current choice, if the menu has one.
    setActive(Math.max(0, items.findIndex((it) => it.checked)));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, setOpen]);

  function pick(i: number) {
    setOpen(false);
    button.current?.focus();
    items[i].onSelect();
  }

  function onKey(e: KeyboardEvent) {
    const last = items.length - 1;
    if (e.key === "ArrowDown") setActive((i) => (i === last ? 0 : i + 1));
    else if (e.key === "ArrowUp") setActive((i) => (i === 0 ? last : i - 1));
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key === "Escape") {
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") setOpen(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {(open || closing) && (
        <ul
          ref={list}
          role="menu"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onKey}
          style={{ top: pos.top, left: pos.left, width: WIDTH }}
          className={cn(
            "fixed z-50 flex flex-col gap-0.5 rounded-[var(--radius)] border border-border bg-card p-1 text-sm text-card-foreground shadow-lg outline-none",
            open ? "motion-safe:animate-menu-in" : "pointer-events-none motion-safe:animate-menu-out",
          )}
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={item.label}
                id={`${id}-${i}`}
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.checked}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={cn(
                  "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-[calc(var(--radius)-4px)] px-2.5",
                  i === active && "bg-muted",
                )}
              >
                {Icon && <Icon className={cn("size-4", item.checked ? "text-primary" : "text-muted-foreground")} />}
                <span className={cn("flex-1", item.checked && "font-medium")}>{item.label}</span>
                {item.checked && <Check className="size-4 text-primary" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
