"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { STATUSES, STATUS_DOTS, STATUS_STYLES, type Status } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

const MENU_WIDTH = 208; // px
const ROW_HEIGHT = 36; // px, used to decide whether the menu fits below

/**
 * A status pill that opens our own menu, instead of the phone's built-in
 * dropdown (which looks different on every device and ignores dark
 * mode). Built as an accessible "listbox": screen readers announce it,
 * and it works with arrow keys, Enter and Esc.
 *
 * The menu uses fixed positioning so the Jobs list card cannot cut it
 * off, and opens upwards when there is no room below.
 */
export function StatusMenu({
  value,
  pending,
  onChange,
  options = STATUSES,
}: {
  value: Status;
  pending: boolean;
  onChange: (next: Status) => void;
  options?: readonly { value: Status; label: string }[]; // which statuses to offer
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.findIndex((s) => s.value === value);

  function openMenu() {
    const rect = triggerRef.current!.getBoundingClientRect();
    const height = options.length * ROW_HEIGHT + 8;
    const below = rect.bottom + 6 + height <= window.innerHeight;
    setPosition({
      top: below ? rect.bottom + 6 : Math.max(8, rect.top - 6 - height),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)),
    });
    setActive(current);
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function pick(index: number) {
    close();
    onChange(options[index].value);
  }

  // While open: move focus into the menu, and close it on a tap outside,
  // on scroll (it would float away from its pill) or on resize.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  function onMenuKey(e: KeyboardEvent) {
    const last = options.length - 1;
    const moves: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => (i === last ? 0 : i + 1)),
      ArrowUp: () => setActive((i) => (i === 0 ? last : i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    const move = moves[e.key];
    if (!move) return;
    if (e.key !== "Tab") e.preventDefault();
    move();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={`Status: ${options[current]?.label}. Change status`}
        disabled={pending}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "group inline-flex h-8 w-40 items-center gap-2 rounded-full pl-3 pr-2.5 text-xs font-medium shadow-sm ring-1 ring-inset ring-black/5 transition-all",
          "hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait dark:ring-white/10 sm:w-44",
          STATUS_STYLES[value],
          pending && "opacity-70",
        )}
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />
        <span className="flex-1 truncate text-left">{options[current]?.label}</span>
        {pending ? (
          <LoaderCircle aria-hidden className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {/* Drawn on <body> (a portal), so a blurred or moving parent (the
          repair action bar) can't pull it off the screen. */}
      {open &&
        createPortal(
        <ul
          ref={menuRef}
          id={`${id}-menu`}
          role="listbox"
          tabIndex={-1}
          aria-label="Choose a status"
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onMenuKey}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 flex flex-col gap-0.5 rounded-[var(--radius)] border border-border bg-card p-1 text-sm text-card-foreground shadow-lg outline-none motion-safe:animate-menu-in"
        >
          {options.map((s, i) => {
            const selected = i === current;
            return (
              <li
                key={s.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={cn(
                  "flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-inner px-2.5",
                  i === active && "bg-muted",
                  selected && "font-medium text-tertiary",
                )}
              >
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOTS[s.value])} />
                <span className="flex-1">{s.label}</span>
                {selected && <Check aria-hidden className="size-4 text-primary" />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
}
