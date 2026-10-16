"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Boxes, ChartColumn, LayoutDashboard, Menu as MenuIcon, Plus, Search, Star, UserRound, Users } from "lucide-react";
import { Menu, type MenuItem } from "@/components/menu";
import { inSection } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Phones only (ticket 77): the main pages as a bar along the bottom,
 * where a thumb reaches, with a big + for a new repair in the middle.
 * "More" holds the rest. The top bar's page buttons are hidden on phones
 * so nothing is doubled. The current section is highlighted (ticket 78).
 */
export function MobileNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const more: MenuItem[] = [
    { label: "Reviews", icon: Star, onSelect: () => router.push("/reviews") },
    ...(isOwner ? [{ label: "Reports", icon: ChartColumn, onSelect: () => router.push("/reports") }] : []),
    { label: "Notifications", icon: Bell, onSelect: () => router.push("/notifications") },
    { label: "Account", icon: UserRound, onSelect: () => router.push("/account") },
    {
      label: "Search",
      icon: Search,
      // Same as Ctrl+K: opens the command palette.
      onSelect: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true })),
    },
  ];
  const moreActive = ["/reviews", "/reports", "/notifications", "/account"].some((href) => inSection(href, pathname));

  return (
    <nav
      aria-label="Main (phone)"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
    >
      <ul className="grid h-16 grid-cols-5 items-center">
        <Tab href="/" label="Overview" icon={LayoutDashboard} active={inSection("/", pathname)} />
        <Tab href="/inventory" label="Inventory" icon={Boxes} active={inSection("/inventory", pathname)} />
        <li className="flex justify-center">
          <Link
            href="/jobs/new"
            aria-label="New repair"
            aria-current={pathname === "/jobs/new" ? "page" : undefined}
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-card active:scale-95 motion-reduce:active:scale-100"
          >
            <Plus className="size-6" aria-hidden />
          </Link>
        </li>
        <Tab href="/workspace" label="Workspace" icon={Users} active={inSection("/workspace", pathname)} />
        <li className="flex justify-center">
          <Menu
            label="More pages"
            align="end"
            items={more}
            triggerClassName={tabClass(moreActive)}
            trigger={
              <>
                <MenuIcon className="size-5" aria-hidden />
                <span className="text-[11px] font-medium">More</span>
              </>
            }
          />
        </li>
      </ul>
    </nav>
  );
}

function tabClass(active: boolean) {
  return cn(
    "relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-inner",
    active ? "text-nav-active" : "text-muted-foreground active:bg-muted",
    // A short bar above the current one.
    active && "before:absolute before:top-0 before:h-0.5 before:w-8 before:rounded-full before:bg-nav-active",
  );
}

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Plus; active: boolean }) {
  return (
    <li className="flex justify-center px-1">
      <Link href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
        <Icon className="size-5" aria-hidden />
        <span className="text-[11px] font-medium">{label}</span>
      </Link>
    </li>
  );
}
