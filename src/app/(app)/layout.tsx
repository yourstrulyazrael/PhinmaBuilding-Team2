import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { ThemeSwitch } from "@/components/theme-switch";
import { signOut } from "../login/actions";
import { NavLinks } from "./nav-links";
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

          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitch />
            <Avatar name={name} contact={technician?.contact_number} />
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

// Who is signed in: initials, with name and number sliding out on
// hover. Hidden on narrow phones to leave room for the buttons.
function Avatar({ name, contact }: { name: string; contact?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return (
    <span className="group/reveal hidden h-9 items-center px-1 sm:flex" title={name}>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary text-xs font-semibold text-tertiary-foreground md:size-9 md:text-sm"
      >
        {initials || "T"}
      </span>
      <RevealLabel className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{name}</span>
        {contact && <span className="text-xs text-muted-foreground">{contact}</span>}
      </RevealLabel>
    </span>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={`${revealItem} text-muted-foreground hover:bg-muted hover:text-foreground`}>
        <LogOut className="size-4 shrink-0 md:size-5" aria-hidden />
        <RevealLabel>Sign out</RevealLabel>
      </button>
    </form>
  );
}
