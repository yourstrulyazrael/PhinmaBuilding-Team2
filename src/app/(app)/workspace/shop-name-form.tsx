"use client";

import { useActionState } from "react";
import { renameShop, type ShopNameState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopNameForm({ shopId, name }: { shopId: string; name: string }) {
  const [state, formAction, pending] = useActionState<ShopNameState, FormData>(renameShop.bind(null, shopId), {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="shop_name">Shop name</Label>
      <div className="flex gap-2">
        <Input id="shop_name" name="shop_name" defaultValue={name} maxLength={80} required />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      )}
    </form>
  );
}
