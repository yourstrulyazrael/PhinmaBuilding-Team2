"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/jobs/new", label: "Add a repair", icon: Plus },
  { href: "/details", label: "My details", icon: UserRound },
];

// The technician's navigation. "use client" because it reads the
// current address to highlight the page you are on.
export function NavLinks({ layout }: { layout: "sidebar" | "topbar" }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        layout === "sidebar" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto",
      )}
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
