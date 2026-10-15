import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm } from "./details-form";

export default async function DetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS only lets the technician see their own row, so this returns at
  // most one row: theirs.
  const { data: technician } = await supabase
    .from("technicians")
    .select("display_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>My details</CardTitle>
          <CardDescription>
            Customers see these on every claim slip and tracking page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailsForm
            displayName={technician?.display_name ?? ""}
            contactNumber={technician?.contact_number ?? ""}
          />
        </CardContent>
      </Card>
    </main>
  );
}
