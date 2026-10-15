"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Boxes, ChartColumn, LayoutDashboard, Plus, Users } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";

// ownerOnly links (the shop's earnings) are left out for staff; the pages
// themselves also send staff away.
const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/jobs/new", label: "Add a repair", icon: Plus, ownerOnly: false },
  { href: "/reports", label: "Reports & analytics", icon: ChartColumn, ownerOnly: true },
  { href: "/inventory", label: "Inventory", icon: Boxes, ownerOnly: false },
  { href: "/workspace", label: "Workspace", icon: Users, ownerOnly: false },
];

// The technician's navigation, in the top bar: square icon buttons, each
// with a tooltip naming it and its keyboard shortcut (Alt+1, Alt+2…, in
// the order shown). "use client" because it reads the current address to
// highlight the page you are on, and listens for the shortcuts.
export function NavLinks({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = visibleLinks(isOwner);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // e.code is the physical key, so this also works where Alt+number
      // types a symbol (Option on a Mac).
      const n = /^Digit([1-9])$/.exec(e.code)?.[1];
      const link = n ? visibleLinks(isOwner)[Number(n) - 1] : undefined;
      if (!link) return;
      e.preventDefault();
      router.push(link.href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOwner, router]);

  return (
    // On a narrow phone the icons scroll sideways rather than push the
    // bell, account and sign out off the screen. (No tooltips there to clip.)
    <nav
      aria-label="Main"
      className="flex min-w-0 items-center gap-1 max-sm:overflow-x-auto max-sm:[scrollbar-width:none] sm:gap-1.5 md:gap-2"
    >
      {links.map(({ href, label, icon: Icon }, i) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-keyshortcuts={`Alt+${i + 1}`}
            className={cn(revealItem, active ? activeItem : idleItem)}
          >
            <Icon className="size-[18px] shrink-0 md:size-5" aria-hidden />
            <RevealLabel shortcut={`Alt+${i + 1}`}>{label}</RevealLabel>
          </Link>
        );
      })}
    </nav>
  );
}

function visibleLinks(isOwner: boolean) {
  return LINKS.filter((l) => isOwner || !l.ownerOnly);
}

// The page you are on: an outline, forest green in light mode and blue in
// dark (the nav-active colour in globals.css). Everything else: grey until
// hovered.
const activeItem = "bg-nav-active/10 text-nav-active ring-2 ring-inset ring-nav-active";
const idleItem = "text-muted-foreground hover:bg-muted hover:text-foreground";

// --- The bell (tickets 38 and 41) ---------------------------------------
//
// Which notifications you have seen is remembered in this browser
// (localStorage), per person. It is only a convenience for the badge:
// if it is cleared, or you use another device, the badge simply counts
// everything again. Nothing about the notifications themselves is stored.

const REFRESH_MS = 30_000;
const CHANGED = "zenith:notifications-seen";

function storageKey(kind: "seen" | "known", userId: string) {
  return `zenith.notifications.${kind}.${userId}`;
}

function readKeys(kind: "seen" | "known", userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKey(kind, userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeKeys(kind: "seen" | "known", userId: string, keys: string[]) {
  try {
    localStorage.setItem(storageKey(kind, userId), JSON.stringify(keys));
  } catch {
    // Private browsing can block storage: the badge just won't remember.
  }
}

// The "seen" list as a value React can watch: re-read when this tab or
// another one changes it.
function useSeen(userId: string) {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(CHANGED, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGED, onChange);
      };
    },
    () => {
      try {
        return localStorage.getItem(storageKey("seen", userId));
      } catch {
        return null;
      }
    },
    () => undefined, // on the server: not known yet, so no badge
  );
  if (raw === undefined) return undefined;
  try {
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

/**
 * The bell, beside the account: opens Notifications.
 *   - The badge counts only notifications you haven't seen yet; opening
 *     Notifications clears it.
 *   - When one you have never been shown arrives, the badge pulses and
 *     the bell wiggles a few times (not if the device asks for less
 *     motion).
 *   - Every 30 seconds, while the tab is open and visible, the page's
 *     data is refreshed in the background, so new ones arrive without
 *     reloading.
 * `keys` names every current notification (getNotifications in
 * lib/session.ts).
 */
export function NotificationsLink({ keys, userId }: { keys: string[]; userId: string }) {
  const onPage = usePathname() === "/notifications";
  const router = useRouter();
  const seen = useSeen(userId);
  const bellRef = useRef<SVGSVGElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const keyList = keys.join("\n"); // a stable value for the effects below

  // Opening Notifications marks everything on it as seen.
  useEffect(() => {
    if (!onPage) return;
    writeKeys("seen", userId, keyList ? keyList.split("\n") : []);
    window.dispatchEvent(new Event(CHANGED));
  }, [onPage, keyList, userId]);

  // Something you've never been shown arrived: pulse and wiggle. Waits
  // until the seen list is read (`ready`), so the badge is on screen.
  const ready = seen !== undefined;
  useEffect(() => {
    if (!ready) return;
    const current = keyList ? keyList.split("\n") : [];
    const known = readKeys("known", userId);
    writeKeys("known", userId, current);
    // The very first time on this device there is nothing to compare with.
    if (!known || onPage) return;
    if (!current.some((k) => !known.has(k))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    badgeRef.current?.animate(
      [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.45)", opacity: 0.35 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 650, iterations: 4, easing: "ease-in-out" },
    );
    bellRef.current?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(16deg)" },
        { transform: "rotate(-14deg)" },
        { transform: "rotate(8deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 650, iterations: 3, easing: "ease-in-out" },
    );
  }, [ready, keyList, userId, onPage]);

  // New notifications arrive without reloading.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  // Unseen ones, with low stock counted once however many parts are low.
  const unseen = seen === undefined || onPage ? [] : keys.filter((k) => !seen.has(k));
  const count = unseen.filter((k) => !k.startsWith("low:")).length + (unseen.some((k) => k.startsWith("low:")) ? 1 : 0);
  const label = count > 0 ? `Notifications: ${count} new` : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-current={onPage ? "page" : undefined}
      aria-label={label}
      className={cn(revealItem, onPage ? activeItem : idleItem)}
    >
      <Bell ref={bellRef} className="size-[18px] shrink-0 origin-top md:size-5" aria-hidden />
      {count > 0 && (
        <span
          ref={badgeRef}
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-2 ring-card"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      <RevealLabel align="end">Notifications</RevealLabel>
    </Link>
  );
}

/**
 * Who is signed in, as their initials, at the right of the top bar.
 * Clicking it opens Account (ticket 34); the tooltip shows their name
 * and number. Outlined on the Account page, like the other links.
 */
export function AccountLink({ name, contact }: { name: string; contact?: string }) {
  const active = usePathname() === "/account";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

  return (
    <Link
      href="/account"
      aria-current={active ? "page" : undefined}
      aria-label={`Account: ${name}`}
      className={cn(revealItem, active ? activeItem : idleItem)}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold md:size-8 md:text-xs",
          active ? "bg-nav-active text-white dark:text-[#0f1729]" : "bg-tertiary text-tertiary-foreground",
        )}
      >
        {initials || "T"}
      </span>
      <RevealLabel align="end" className="flex-col items-start gap-0.5 leading-tight">
        <span>Account</span>
        <span className="font-medium text-muted-foreground">
          {name}
          {contact && ` · ${contact}`}
        </span>
      </RevealLabel>
    </Link>
  );
}
