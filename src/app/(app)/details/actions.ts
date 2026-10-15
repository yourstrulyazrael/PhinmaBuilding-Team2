"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DetailsState = { error?: string; saved?: boolean };

export async function saveDetails(
  _prev: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const contactNumber = String(formData.get("contact_number") ?? "").trim();

  // Same limits as the database, so the technician gets a clear message
  // instead of a database error.
  if (!displayName || displayName.length > 80) {
    return { error: "Enter a display name (up to 80 characters)." };
  }
  if (!contactNumber || contactNumber.length > 40) {
    return { error: "Enter a contact number (up to 40 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };

  // "Upsert" = insert the row the first time, update it after that.
  const { error } = await supabase.from("technicians").upsert({
    id: user.id,
    display_name: displayName,
    contact_number: contactNumber,
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
