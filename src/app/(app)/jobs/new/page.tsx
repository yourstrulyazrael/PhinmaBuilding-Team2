import { redirect } from "next/navigation";
import { todayInManila } from "@/lib/jobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewJobForm } from "./new-job-form";
import { getShop, getUser } from "@/lib/session";

export default async function NewJobPage() {
  // A job must belong to a shop (the database insists), so anyone
  // without one is sent to Set up first. Shared with the layout, so this
  // costs no extra trip to the database (lib/session.ts).
  if (!(await getUser())) redirect("/login");
  if (!(await getShop())) redirect("/setup");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 md:py-10">
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
