"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ChartColumn, ClipboardList, LayoutDashboard, Plus, UserRound, Users } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";

// ownerOnly links (the shop's earnings) are left out for staff; the pages
// themselves also send staff away.
const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/jobs/new", label: "Add a repair", icon: Plus, ownerOnly: false },
  { href: "/analytics", label: "Analytics", icon: ChartColumn, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: ClipboardList, ownerOnly: true },
  { href: "/inventory", label: "Inventory", icon: Boxes, ownerOnly: false },
  { href: "/workspace", label: "Workspace", icon: Users, ownerOnly: false },
  // On a phone the bar is full: My details is also in Workspace → Shop
  // settings, so it hides there.
  { href: "/details", label: "My details", icon: UserRound, ownerOnly: false, phoneHidden: true },
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
      {links.map(({ href, label, icon: Icon, ...link }, i) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-keyshortcuts={`Alt+${i + 1}`}
            className={cn(
              revealItem,
              "phoneHidden" in link && "hidden sm:flex",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
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
