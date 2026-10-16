import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { ThemeSwitch } from "@/components/theme-switch";
import { signOut } from "../login/actions";
import { AccountLink, NavGlide, NavLinks, NotificationsLink } from "./nav-links";
import { ShopLive } from "./shop-live";
import { CommandPalette } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { CurrencyProvider } from "@/components/currency";
import { ToastProvider } from "@/components/toast";
import { getMe, getNotifications, getShop, getUser } from "@/lib/session";

/**
 * The signed-in technician's shell: one top bar on every screen size,
 * with icon-only buttons whose names slide out on hover. Every page
 * inside the (app) folder sits under it.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Fetched once per page load and shared with the page (lib/session.ts);
  // the shop and the person's details load at the same time.
  const user = await getUser();
  if (!user) redirect("/login");
  // The bell's count (ticket 38) loads alongside; shared with the
  // Notifications page if that is the page being opened.
  const [shop, technician, notifications] = await Promise.all([getShop(), getMe(), getNotifications()]);

  // Every page in here needs a shop: jobs belong to one.
  if (!shop) redirect("/setup");

  const name = technician?.display_name ?? "Technician";

  return (
    // Browser-drawn amounts use the shop's currency (ticket 54).
    <CurrencyProvider currency={shop.currency}>
      {/* Toasts for every page (ticket 67). */}
      <ToastProvider>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur print:hidden">
          {/* Full width: logo and pages hug the left edge; theme, bell,
              account and sign out the right edge, at any screen size. */}
          <div className="relative flex h-14 w-full items-center gap-2 px-4 md:h-16 md:gap-4 md:px-8 2xl:px-12">
            {/* The highlight that glides to the current page (ticket 59). */}
            <NavGlide />
            <Link href="/" aria-label="Zenith Repair: Overview" className="shrink-0 rounded-[var(--radius)]">
              {/* On a narrow phone, just the logo: the buttons need the room. */}
              <Logo size={36} nameClassName="hidden sm:inline" />
            </Link>
  
            <NavLinks isOwner={shop.role === "owner"} />
  
            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
              {/* Ctrl+K search and the keyboard shortcuts (ticket 68). */}
              <CommandPalette isOwner={shop.role === "owner"} />
              <ThemeSwitch />
              <NotificationsLink keys={notifications.keys} userId={user.id} />
              <AccountLink name={name} contact={technician?.contact_number} />
              <SignOutButton />
            </div>
          </div>
        </header>
  
        {/* On phones, room at the bottom for the tab bar (ticket 77). */}
        <div className="flex min-w-0 flex-1 flex-col pb-[var(--mobile-nav,0px)]">{children}</div>
        <MobileNav isOwner={shop.role === "owner"} />
  
        {/* Customer answers arrive live (ticket 52). */}
        <ShopLive shopId={shop.id} userId={user.id} isOwner={shop.role === "owner"} />
      </div>
      </ToastProvider>
    </CurrencyProvider>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={`${revealItem} text-muted-foreground hover:bg-muted hover:text-foreground`}>
        <LogOut className="size-[18px] shrink-0 md:size-5" aria-hidden />
        <RevealLabel align="end">Sign out</RevealLabel>
      </button>
    </form>
  );
}
