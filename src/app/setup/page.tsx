import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SetupForm } from "./setup-form";

/**
 * Shown once, after signing up: everyone must be in a shop before they
 * can see any jobs. Start a new shop (become its owner) or join one
 * with an invite code (become an apprentice). Sits outside the (app)
 * folder, so there is no sidebar yet.
 */
export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in a shop: nothing to set up.
  if (await getMyShop(supabase, user.id)) redirect("/");

  const { data: technician } = await supabase
    .from("technicians")
    .select("display_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();

  const mode = (await searchParams).mode === "join" ? "join" : "start";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <Logo />

      <nav className="grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-border bg-card p-1" aria-label="Set up">
        {(
          [
            { key: "start", label: "Start a shop", href: "/setup" },
            { key: "join", label: "Join a shop", href: "/setup?mode=join" },
          ] as const
        ).map((m) => (
          <Link
            key={m.key}
            href={m.href}
            aria-current={mode === m.key ? "page" : undefined}
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-3 py-2 text-center text-sm font-medium",
              mode === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {m.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-tertiary">{mode === "start" ? "Start your shop" : "Join a shop"}</CardTitle>
          <CardDescription>
            {mode === "start"
              ? "You'll be the shop's owner. You can invite apprentices from Shop settings."
              : "You'll join as an apprentice: you can add repairs and work on the phones you handle."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* A new key per mode resets the form when switching. */}
          <SetupForm
            key={mode}
            mode={mode}
            displayName={technician?.display_name ?? ""}
            contactNumber={technician?.contact_number ?? ""}
          />
        </CardContent>
      </Card>
    </main>
  );
}
