"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ChartLine, FileText, LayoutGrid, Package, Plus, UserRound } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";

// ownerOnly links (the shop's earnings) are left out for staff; the pages
// themselves also send staff away.
const LINKS = [
  { href: "/", label: "Overview", icon: LayoutGrid, ownerOnly: false },
  { href: "/jobs/new", label: "Add a repair", icon: Plus, ownerOnly: false },
  { href: "/analytics", label: "Analytics", icon: ChartLine, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: FileText, ownerOnly: true },
  { href: "/inventory", label: "Inventory", icon: Package, ownerOnly: false },
  { href: "/workspace", label: "Workspace", icon: Briefcase, ownerOnly: false },
  // On a phone the bar is full: My details is also in Workspace → Shop
  // settings, so it hides there.
  { href: "/details", label: "My details", icon: UserRound, ownerOnly: false, phoneHidden: true },
];

// The technician's navigation, in the top bar: icons only, and each
// name slides out on hover. "use client" because it reads the current
// address to highlight the page you are on.
export function NavLinks({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
      {LINKS.filter((l) => isOwner || !l.ownerOnly).map(({ href, label, icon: Icon, ...link }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              revealItem,
              "phoneHidden" in link && "hidden sm:flex",
              active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 md:size-5" aria-hidden />
            <RevealLabel>{label}</RevealLabel>
          </Link>
        );
      })}
    </nav>
  );
}
