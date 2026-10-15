import { KeyRound, Settings2, Store } from "lucide-react";
import type { MyShop } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm } from "../details/details-form";
import { makeNewInviteCode } from "./actions";
import { ShopNameForm } from "./shop-name-form";

// Everyone can edit their own name and number. Only the owner gets the
// shop name and invite code (RLS hides the code from everyone else
// anyway: inviteCode is null for an apprentice).
export function ShopSettings({
  shop,
  displayName,
  contactNumber,
  inviteCode,
}: {
  shop: MyShop;
  displayName: string;
  contactNumber: string;
  inviteCode: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {shop.role === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <Store className="size-4" aria-hidden />
              Your shop
            </CardTitle>
            <CardDescription>Shown on every claim slip and tracking page, with your number.</CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-md flex-col gap-6">
            <ShopNameForm shopId={shop.id} name={shop.name} />

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-4" aria-hidden />
                Invite code
              </p>
              <p className="w-fit rounded-[var(--radius)] border border-dashed border-border bg-muted px-4 py-2 font-mono text-xl tracking-[0.3em] text-tertiary">
                {inviteCode ?? "––––––––"}
              </p>
              <p className="text-xs text-muted-foreground">
                Give this to a new apprentice. They choose &quot;Join a shop&quot; after signing up and type it in.
                Make a new code when someone leaves, so the old one stops working.
              </p>
              <form action={makeNewInviteCode}>
                <Button type="submit" variant="secondary" size="sm">
                  Make a new code
                </Button>
              </form>
            </div>
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
            {shop.role === "owner"
              ? "Your name and number. Customers see your number on every claim slip and tracking page."
              : "Your name and number, seen by your shopmates."}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <DetailsForm displayName={displayName} contactNumber={contactNumber} />
        </CardContent>
      </Card>
    </div>
  );
}
