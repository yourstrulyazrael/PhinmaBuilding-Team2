import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { signOut } from "../login/actions";
import { NavLinks } from "./nav-links";

/**
 * The signed-in technician's shell: a sidebar on tablet and laptop, a
 * compact top bar on a phone. Every page inside the (app) folder sits
 * in here.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Every page in here needs a shop: jobs belong to one.
  const shop = await getMyShop(supabase, user.id);
  if (!shop) redirect("/setup");

  const { data: technician } = await supabase
    .from("technicians")
    .select("display_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();

  const name = technician?.display_name ?? "Technician";

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* Sidebar: tablet and laptop */}
      <aside className="hidden print:hidden! w-60 shrink-0 flex-col border-r border-border bg-card md:flex md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>
        <div className="px-3">
          <NavLinks layout="sidebar" />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 px-5 pb-3">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeSwitch />
        </div>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {technician?.contact_number ?? "Add your details"}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Top bar: phone */}
      <header className="sticky top-0 z-10 border-b border-border bg-card md:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo />
          {/* No avatar here: a phone has little room, and the theme switch
              matters more. */}
          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitch />
            <SignOutButton />
          </div>
        </div>
        <div className="px-2 pb-2">
          <NavLinks layout="topbar" />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tertiary text-xs font-semibold text-tertiary-foreground"
    >
      {initials || "T"}
    </span>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        title="Sign out"
        className="flex size-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="sr-only">Sign out</span>
      </button>
    </form>
  );
}
