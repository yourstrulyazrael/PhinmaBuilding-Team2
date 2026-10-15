"use client";

import { useActionState } from "react";
import { joinShop, startShop, type SetupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// "start": becomes the owner of a new shop. "join": becomes an
// apprentice of an existing shop, using the owner's invite code.
export function SetupForm({
  mode,
  displayName,
  contactNumber,
}: {
  mode: "start" | "join";
  displayName: string;
  contactNumber: string;
}) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(
    mode === "start" ? startShop : joinShop,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="display_name">Your name</Label>
        <Input id="display_name" name="display_name" defaultValue={displayName} maxLength={80} placeholder="e.g. Jun Reyes" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact_number">Contact number</Label>
        <Input
          id="contact_number"
          name="contact_number"
          type="tel"
          defaultValue={contactNumber}
          maxLength={40}
          placeholder="e.g. 0917 123 4567"
          required
        />
      </div>

      {mode === "start" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="shop_name">Shop name</Label>
          <Input id="shop_name" name="shop_name" maxLength={80} placeholder="e.g. Zenith Repair" required />
          <p className="text-xs text-muted-foreground">
            Customers see the shop name and your number on every claim slip and tracking page.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite_code">Invite code</Label>
          <Input
            id="invite_code"
            name="invite_code"
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="e.g. K7MP3QXA"
            className="font-mono uppercase tracking-widest"
            required
          />
          <p className="text-xs text-muted-foreground">
            Ask the shop owner. It&apos;s in their Workspace, under Shop settings.
          </p>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {mode === "start" ? (pending ? "Starting…" : "Start my shop") : pending ? "Joining…" : "Join the shop"}
      </Button>
    </form>
  );
}
