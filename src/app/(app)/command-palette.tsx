"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Bell,
  CornerDownLeft,
  CreditCard,
  Keyboard,
  Loader2,
  Search,
  Smartphone,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";
import { visibleLinks } from "./nav-links";
import { searchRepairs, type RepairHit } from "./search-actions";

type Item = {
  id: string;
  group: "Repairs" | "Actions" | "Go to";
  label: string;
  hint?: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
};

// Mac keyboards say ⌘, everyone else Ctrl. Read after the page loads.
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The command palette (ticket 68): Ctrl+K (⌘K on a Mac), or the search
 * button in the top bar. Type to find a repair (device, customer,
 * contact no. or ZR- number), jump to a page, or start an action.
 * ↑ ↓ to move, Enter to open, Esc to close.
 *
 * Also the app's other keyboard shortcuts, when you're not typing in a box:
 *   /   search the repair list (or open this palette on other pages)
 *   N   add a new repair
 *   ?   show all shortcuts
 * (Alt+1…6 for the top-bar pages lives in nav-links.tsx.)
 */
export function CommandPalette({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const mac = useSyncExternalStore(() => () => {}, isMac, () => false);
  const mod = mac ? "⌘" : "Ctrl";

  // The global shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHelp(false);
        setOpen((o) => !o);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target) || document.querySelector("dialog[open], [aria-modal=\"true\"]")) return;
      if (e.key === "/") {
        e.preventDefault();
        const box = document.querySelector<HTMLInputElement>('[data-shortcut="search"]');
        if (box) {
          box.focus();
          box.select();
        } else {
          setHelp(false);
          setOpen(true);
        }
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/jobs/new");
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Close when the page changes (e.g. after picking a result).
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHelp(false);
          setOpen(true);
        }}
        aria-keyshortcuts="Control+K Meta+K"
        aria-haspopup="dialog"
        className={cn(revealItem, "text-muted-foreground hover:bg-muted hover:text-foreground")}
      >
        <Search className="size-[18px] shrink-0 md:size-5" aria-hidden />
        <RevealLabel shortcut={`${mod} K`}>Search &amp; commands</RevealLabel>
      </button>
      {/* On <body>, so the top bar's blur can't shrink the overlay to the bar. */}
      {open &&
        createPortal(
        <Palette
          isOwner={isOwner}
          mod={mod}
          help={help}
          onHelp={setHelp}
          onClose={() => setOpen(false)}
          go={(href) => {
            setOpen(false);
            router.push(href);
          }}
        />,
        document.body,
      )}
    </>
  );
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

function Palette({
  isOwner,
  mod,
  help,
  onHelp,
  onClose,
  go,
}: {
  isOwner: boolean;
  mod: string;
  help: boolean;
  onHelp: (on: boolean) => void;
  onClose: () => void;
  go: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<RepairHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const latest = useRef("");
  const id = useId();

  // Focus the box; give focus back to where it was on close; no page
  // scrolling underneath while open.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  // Search repairs a moment after typing stops. Only the newest answer counts.
  useEffect(() => {
    const q = query.trim();
    latest.current = q;
    if (!q) return;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        const found = await searchRepairs(q);
        if (latest.current === q) setHits(found);
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (text: string) => words.every((w) => text.toLowerCase().includes(w));
    const repairs: Item[] = (q ? hits : []).map((h) => ({
      id: `repair-${h.id}`,
      group: "Repairs",
      label: `${h.device} · ${h.customer}`,
      hint: `${h.number} · ${h.status}`,
      icon: Smartphone,
      run: () => go(`/jobs/${h.id}`),
    }));
    const actions: Item[] = [
      { id: "new", group: "Actions", label: "New repair", hint: "Check in a phone", icon: Smartphone, shortcut: "N", run: () => go("/jobs/new") },
      { id: "customer", group: "Actions", label: "Find a customer", hint: "Customers and their repairs", icon: UsersRound, run: () => go("/workspace") },
      { id: "payment", group: "Actions", label: "Record a payment", hint: "Repairs ready for pickup", icon: CreditCard, run: () => go("/?tab=ready") },
      { id: "help", group: "Actions", label: "Keyboard shortcuts", icon: Keyboard, shortcut: "?", run: () => onHelp(true) },
    ];
    const pages: Item[] = [
      ...visibleLinks(isOwner).map((l, i) => ({
        id: `page-${l.href}`,
        group: "Go to" as const,
        label: l.label,
        icon: l.icon,
        shortcut: `Alt ${i + 1}`,
        run: () => go(l.href),
      })),
      { id: "page-notifications", group: "Go to", label: "Notifications", icon: Bell, run: () => go("/notifications") },
      { id: "page-account", group: "Go to", label: "Account", icon: UserRound, run: () => go("/account") },
    ];
    return [...repairs, ...[...actions, ...pages].filter((it) => matches(`${it.label} ${it.hint ?? ""}`))];
  }, [query, hits, isOwner, go, onHelp]);

  const current = Math.min(active, Math.max(0, items.length - 1));

  // Keep the highlighted row in view.
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (help) onHelp(false);
      else onClose();
    } else if (help) {
      return;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(items.length ? (current + 1) % items.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(items.length ? (current - 1 + items.length) % items.length : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[current]?.run();
    } else if (e.key === "Tab") {
      // Arrows move through the list; keep focus in the box.
      e.preventDefault();
    }
  }

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px] motion-safe:animate-[fade-in_120ms_ease-out]"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={help ? "Keyboard shortcuts" : "Search and commands"}
        onKeyDown={onKey}
        className="flex max-h-[70dvh] w-full max-w-xl animate-menu-in flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-2xl"
      >
        {help ? (
          <Shortcuts mod={mod} onBack={() => onHelp(false)} />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4">
              {searching ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              ) : (
                <Search className="size-4 text-muted-foreground" aria-hidden />
              )}
              <input
                ref={input}
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={items.length ? `${id}-${current}` : undefined}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                  if (!e.target.value.trim()) setHits([]);
                }}
                placeholder="Search repairs, or type a command…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground focus-visible:outline-none"
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">Esc</kbd>
            </div>
            <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2">
              {items.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {searching ? "Searching…" : `Nothing matches “${query.trim()}”.`}
                </li>
              )}
              {items.map((it, i) => {
                const heading = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const Icon = it.icon;
                return (
                  <li key={it.id} role="presentation">
                    {heading && (
                      <p role="presentation" className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1">
                        {heading}
                      </p>
                    )}
                    <div
                      id={`${id}-${i}`}
                      role="option"
                      aria-selected={i === current}
                      data-index={i}
                      onPointerMove={() => setActive(i)}
                      onClick={() => it.run()}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-inner px-3 py-2.5 text-sm",
                        i === current && "bg-muted",
                      )}
                    >
                      <Icon className={cn("size-4", i === current ? "text-primary" : "text-muted-foreground")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{it.label}</span>
                        {it.hint && <span className="block truncate text-xs text-muted-foreground">{it.hint}</span>}
                      </span>
                      {it.shortcut && <Kbd>{it.shortcut}</Kbd>}
                      {i === current && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden />}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> move</span>
              <span><Kbd>Enter</Kbd> open</span>
              <span><Kbd>?</Kbd> all shortcuts</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Shortcuts({ mod, onBack }: { mod: string; onBack: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => back.current?.focus(), []);
  const rows: [string, string[]][] = [
    ["Search and commands", [mod, "K"]],
    ["Search the repair list", ["/"]],
    ["New repair", ["N"]],
    ["Go to a top-bar page", ["Alt", "1–6"]],
    ["Show these shortcuts", ["?"]],
    ["Close a box or menu", ["Esc"]],
  ];
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-tertiary">
          <Keyboard className="size-5" aria-hidden />
          Keyboard shortcuts
        </h2>
        <button ref={back} type="button" onClick={onBack} className="rounded-inner px-2 py-1 text-sm text-primary hover:bg-muted">
          Back to search
        </button>
      </div>
      <dl className="divide-y divide-border text-sm">
        {rows.map(([what, keys]) => (
          <div key={what} className="flex items-center justify-between gap-4 py-2.5">
            <dt>{what}</dt>
            <dd className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Letter shortcuts work when you aren&apos;t typing in a box.</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </kbd>
  );
}
