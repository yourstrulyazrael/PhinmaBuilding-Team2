import { KeyRound, Settings2, Store, UserPlus, UsersRound } from "lucide-react";
import type { MyShop, Role } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm } from "../details/details-form";
import { ShopNameForm } from "./shop-name-form";
import { AddStaffForm, ChangePasswordForm } from "./staff-forms";
import { EstimatePermission } from "./estimate-permission";

export type StaffMember = { id: string; name: string; contact: string; role: Role; canReviseEstimate: boolean };

// Everyone can edit their own name, number and password. Only the owner
// gets the shop name, Add staff and the Staff list.
export function ShopSettings({
  shop,
  displayName,
  contactNumber,
  staff,
}: {
  shop: MyShop;
  displayName: string;
  contactNumber: string;
  staff: StaffMember[];
}) {
  const owner = shop.role === "owner";

  return (
    <div className="flex flex-col gap-4">
      {owner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-tertiary">
                <Store className="size-4" aria-hidden />
                Your shop
              </CardTitle>
              <CardDescription>Shown on every claim slip and tracking page, with your number.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md">
              <ShopNameForm shopId={shop.id} name={shop.name} />
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-tertiary">
                <UsersRound className="size-4" aria-hidden />
                Staff
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {staff.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border border-t border-border">
                {staff.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      {m.contact}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {m.role === "owner" ? "Owner" : "Staff"}
                      </span>
                    </span>
                    {m.role === "apprentice" && (
                      <span className="flex w-full justify-end">
                        <EstimatePermission staffId={m.id} name={m.name} allowed={m.canReviseEstimate} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <Settings2 className="size-4" aria-hidden />
            My details
          </CardTitle>
          <CardDescription>
            {owner
              ? "Your name and number. Customers see your number on every claim slip and tracking page."
              : "Your name and number, seen by your shopmates."}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <DetailsForm displayName={displayName} contactNumber={contactNumber} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <KeyRound className="size-4" aria-hidden />
            Password
          </CardTitle>
          <CardDescription>
            {owner ? "Change the password you sign in with." : "Replace the temporary password your shop owner gave you."}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
