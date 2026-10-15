import { KeyRound, Settings2, Store } from "lucide-react";
import type { MyShop } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm } from "../details/details-form";
import { ShopNameForm } from "./shop-name-form";
import { ChangePasswordForm } from "./staff-forms";

// Everyone can edit their own name, number and password. Only the owner
// gets the shop name. (Staff have their own tab: staff-tab.tsx.)
export function ShopSettings({
  shop,
  displayName,
  contactNumber,
}: {
  shop: MyShop;
  displayName: string;
  contactNumber: string;
}) {
  const owner = shop.role === "owner";

  return (
    <div className="flex flex-col gap-4">
      {owner && (
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
