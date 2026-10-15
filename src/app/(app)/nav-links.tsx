"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ChartColumn, LayoutDashboard, Plus, Users } from "lucide-react";
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
    <nav aria-label="Main" className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
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

// The page you are on: the blue accent. Everything else: grey until hovered.
const activeItem = "bg-highlight/15 text-highlight";
const idleItem = "text-muted-foreground hover:bg-muted hover:text-foreground";

/**
 * Who is signed in, as their initials, at the right of the top bar.
 * Clicking it opens Account (ticket 34); the tooltip shows their name
 * and number. Lit up in blue on the Account page, like the other links.
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
          active ? "bg-highlight text-white dark:text-[#0f1729]" : "bg-tertiary text-tertiary-foreground",
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
