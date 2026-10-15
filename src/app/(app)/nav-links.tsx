"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, LayoutGrid, Plus, UserRound } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/jobs/new", label: "Add a repair", icon: Plus },
  { href: "/workspace", label: "Workspace", icon: Briefcase },
  { href: "/details", label: "My details", icon: UserRound },
];

// The technician's navigation, in the top bar: icons only, and each
// name slides out on hover. "use client" because it reads the current
// address to highlight the page you are on.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              revealItem,
              active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <RevealLabel>{label}</RevealLabel>
          </Link>
        );
      })}
    </nav>
  );
}
