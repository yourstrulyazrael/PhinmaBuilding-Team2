import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetupForm } from "./setup-form";

/**
 * Shown once, after signing up: everyone must be in a shop before they
 * can see any jobs. Signing up yourself means starting a shop; staff
 * accounts are created by the shop owner, already inside the shop
 * (ticket 22). Sits outside the (app) folder, so there is no sidebar.
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
      <Logo />
      <Card>
        <CardHeader>
          <CardTitle className="text-tertiary">Start your shop</CardTitle>
          <CardDescription>You&apos;ll be the shop&apos;s owner. You can add staff from Shop settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm displayName={technician?.display_name ?? ""} contactNumber={technician?.contact_number ?? ""} />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Working in someone else&apos;s shop? Don&apos;t start one: ask the owner to create your account, then sign
        in with the email and password they give you.
      </p>
    </main>
  );
}
