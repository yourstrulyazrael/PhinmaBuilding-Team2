"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error?: string };

// Saves the person's name and contact, then starts their shop. The
// database function start_shop makes them its owner.
export async function startShop(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const displayName = text("display_name");
  const contactNumber = text("contact_number");
  const shopName = text("shop_name");

  // Same limits as the database, so the message is clear.
  if (!displayName || displayName.length > 80) return { error: "Enter your name (up to 80 characters)." };
  if (!contactNumber || contactNumber.length > 40) return { error: "Enter a contact number (up to 40 characters)." };
  if (!shopName || shopName.length > 80) return { error: "Enter a shop name (up to 80 characters)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };

  const { error: detailsError } = await supabase
    .from("technicians")
    .upsert({ id: user.id, display_name: displayName, contact_number: contactNumber });
  if (detailsError) return { error: "Couldn't save your details. Please try again." };

  const { error } = await supabase.rpc("start_shop", { shop_name: shopName });
  // start_shop's own messages ("You are already in a shop.") are written
  // for people, so they are safe to show.
  if (error) return { error: error.message };

  redirect("/");
}
