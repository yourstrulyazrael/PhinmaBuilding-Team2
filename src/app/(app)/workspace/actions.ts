"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ShopNameState = { error?: string; saved?: boolean };

// Renames the shop. RLS only lets the owner do this, so for anyone else
// no row changes and we say so.
export async function renameShop(shopId: string, _prev: ShopNameState, formData: FormData): Promise<ShopNameState> {
  const name = String(formData.get("shop_name") ?? "").trim();
  if (!name || name.length > 80) return { error: "Enter a shop name (up to 80 characters)." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("shops").update({ name }).eq("id", shopId).select("id");
  if (error) return { error: "Couldn't save the shop name. Please try again." };
  if (!data?.length) return { error: "Only the shop owner can rename the shop." };

  revalidatePath("/", "layout");
  return { saved: true };
}

// Replaces the invite code. The old one stops working straight away.
// The database function refuses anyone who is not the owner.
export async function makeNewInviteCode() {
  const supabase = await createClient();
  await supabase.rpc("new_invite_code");
  revalidatePath("/workspace");
}
