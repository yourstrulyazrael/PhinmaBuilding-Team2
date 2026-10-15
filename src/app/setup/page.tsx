import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetupForm } from "./setup-form";

/**
 * Shown once, after signing up: everyone must be in a shop before they
 * can see any jobs. Sits outside the (app) folder, so there is no
 * sidebar yet.
 */
export default async function SetupPage() {
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <span className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
          <Wrench className="size-4" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight text-tertiary">Zenith Repair</span>
      </span>
      <Card>
        <CardHeader>
          <CardTitle className="text-tertiary">Start your shop</CardTitle>
          <CardDescription>You&apos;ll be the shop&apos;s owner. You can invite apprentices later.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm
            displayName={technician?.display_name ?? ""}
            contactNumber={technician?.contact_number ?? ""}
          />
        </CardContent>
      </Card>
    </main>
  );
}
