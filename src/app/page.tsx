import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The technician's home screen. Ticket 03 turns this into the Jobs list.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: technician } = await supabase
    .from("technicians")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Claim slips need the technician's name and contact, so fill those in
  // before anything else.
  if (!technician) redirect("/details");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Repair jobs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Hi, {technician.display_name}</CardTitle>
          <CardDescription>No repair jobs yet.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your repair jobs will show here.
        </CardContent>
      </Card>
    </main>
  );
}
