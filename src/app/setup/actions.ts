"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error?: string };

// Both ways in save the person's name and contact first, then call a
// database function: start_shop makes them owner of a new shop,
// join_shop makes them an apprentice of an existing one.

export async function startShop(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const shopName = String(formData.get("shop_name") ?? "").trim();
  if (!shopName || shopName.length > 80) return { error: "Enter a shop name (up to 80 characters)." };
  return saveDetailsThen(formData, "start_shop", { shop_name: shopName });
}

export async function joinShop(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const code = String(formData.get("invite_code") ?? "").trim();
  if (!code) return { error: "Enter the invite code from the shop owner." };
  return saveDetailsThen(formData, "join_shop", { invite_code: code });
}

async function saveDetailsThen(
  formData: FormData,
  fn: "start_shop" | "join_shop",
  args: Record<string, string>,
): Promise<SetupState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const contactNumber = String(formData.get("contact_number") ?? "").trim();

  // Same limits as the database, so the message is clear.
  if (!displayName || displayName.length > 80) return { error: "Enter your name (up to 80 characters)." };
  if (!contactNumber || contactNumber.length > 40) return { error: "Enter a contact number (up to 40 characters)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };

  const { error: detailsError } = await supabase
    .from("technicians")
    .upsert({ id: user.id, display_name: displayName, contact_number: contactNumber });
  if (detailsError) return { error: "Couldn't save your details. Please try again." };

  const { error } = await supabase.rpc(fn, args);
  // These functions' own messages ("That invite code does not match any
  // shop…") are written for people, so they are safe to show.
  if (error) return { error: error.message };

  redirect("/");
}
