import { UserPlus, UsersRound } from "lucide-react";
import type { Role } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStaffForm } from "./staff-forms";
import { EstimatePermission } from "./estimate-permission";

export type StaffMember = { id: string; name: string; contact: string; role: Role; canReviseEstimate: boolean };

// The owner's Staff tab: everyone in the shop, each staff member's
// "Can revise estimates" switch, and Add staff (tickets 22–23).
export function StaffTab({ staff }: { staff: StaffMember[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <UsersRound className="size-4" aria-hidden />
            Staff
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {staff.length}
            </span>
          </CardTitle>
          <CardDescription>Everyone who can sign in to your shop.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border border-t border-border">
            {staff.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.contact}</span>
                </span>
                <span className="flex flex-wrap items-center justify-end gap-3">
                  {m.role === "apprentice" && (
                    <EstimatePermission staffId={m.id} name={m.name} allowed={m.canReviseEstimate} />
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {m.role === "owner" ? "Owner" : "Staff"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <UserPlus className="size-4" aria-hidden />
            Add staff
          </CardTitle>
          <CardDescription>Create an account for someone who works in your shop.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddStaffForm />
        </CardContent>
      </Card>
    </div>
  );
}
