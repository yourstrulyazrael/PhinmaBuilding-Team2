import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayInManila } from "@/lib/jobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewJobForm } from "./new-job-form";

export default async function NewJobPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A job must belong to a shop (the database insists), so anyone
  // without one is sent to Set up first.
  const { data: technician } = await supabase
    .from("technicians")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!technician) redirect("/setup");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 md:py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-tertiary">Add a repair</CardTitle>
          <CardDescription>
            The customer&apos;s name and phone stay private. Only your shop can see them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewJobForm today={todayInManila()} />
        </CardContent>
      </Card>
    </main>
  );
}
