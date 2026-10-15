"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error?: string };

// Saves the person's name and contact, then start_shop makes them the
// owner of a new shop. Staff never come here: the owner creates their
// accounts already inside the shop (ticket 22).

export async function startShop(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const shopName = String(formData.get("shop_name") ?? "").trim();
  if (!shopName || shopName.length > 80) return { error: "Enter a shop name (up to 80 characters)." };
  return saveDetailsThen(formData, "start_shop", { shop_name: shopName });
}

async function saveDetailsThen(
  formData: FormData,
  fn: "start_shop",
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
  // start_shop's own messages ("You are already in a shop.") are
  // written for people, so they are safe to show.
  if (error) return { error: error.message };

  redirect("/");
}
