import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { ThemeSwitch } from "@/components/theme-switch";
import { signOut } from "../login/actions";
import { AccountLink, NavLinks } from "./nav-links";
import { getMe, getShop, getUser } from "@/lib/session";

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
  const [shop, technician] = await Promise.all([getShop(), getMe()]);

  // Every page in here needs a shop: jobs belong to one.
  if (!shop) redirect("/setup");

  const name = technician?.display_name ?? "Technician";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur print:hidden">
        {/* Full width: logo and pages hug the left edge, theme and sign
            out the right edge, at any screen size. */}
        <div className="flex h-14 w-full items-center gap-2 px-4 md:h-16 md:gap-4 md:px-8 2xl:px-12">
          <Link href="/" aria-label="Zenith Repair: Overview" className="shrink-0 rounded-[var(--radius)]">
            {/* On a narrow phone, just the logo: the buttons need the room. */}
            <Logo size={36} nameClassName="hidden sm:inline" />
          </Link>

          <NavLinks isOwner={shop.role === "owner"} />

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <ThemeSwitch />
            <AccountLink name={name} contact={technician?.contact_number} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
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
