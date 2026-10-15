import { redirect } from "next/navigation";
import { todayInManila } from "@/lib/jobs";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NewJobForm } from "./new-job-form";
import { getShop, getUser } from "@/lib/session";

export default async function NewJobPage() {
  // A job must belong to a shop (the database insists), so anyone
  // without one is sent to Set up first. Shared with the layout, so this
  // costs no extra trip to the database (lib/session.ts).
  if (!(await getUser())) redirect("/login");
  if (!(await getShop())) redirect("/setup");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:py-10">
      <PageHeader
        back={{ href: "/", label: "Repair desk" }}
        eyebrow="New repair"
        icon={Plus}
        title="Add a repair"
        description="The customer's name and contact number stay private. Only your shop can see them."
      />
      <Card>
        <CardContent className="pt-6">
          <NewJobForm today={todayInManila()} />
        </CardContent>
      </Card>
    </main>
  );
}
