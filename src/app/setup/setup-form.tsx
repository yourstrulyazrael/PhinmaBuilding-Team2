"use client";

import { useActionState } from "react";
import { startShop, type SetupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Start a new shop and become its owner.
export function SetupForm({ displayName, contactNumber }: { displayName: string; contactNumber: string }) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(startShop, {});

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
      <div className="flex flex-col gap-2">
        <Label htmlFor="shop_name">Shop name</Label>
        <Input id="shop_name" name="shop_name" maxLength={80} placeholder="e.g. Zenith Repair" required />
        <p className="text-xs text-muted-foreground">
          Customers see the shop name and your number on every claim slip and tracking page.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start my shop"}
      </Button>
    </form>
  );
}
