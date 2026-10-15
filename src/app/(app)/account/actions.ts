"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Everything saved from the Account page (ticket 34). Each form gets
 * back { error } or { saved }. The limits match the database, so people
 * get a clear message instead of a database error; RLS still has the
 * final say on who may change what.
 */
export type FormState = { error?: string; saved?: boolean; message?: string };

// The person's own name and contact number. Everyone.
export async function saveDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const contactNumber = String(formData.get("contact_number") ?? "").trim();

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

// The shop's name, address and phone. RLS only lets the owner update the
// shop, so for anyone else no row changes and we say so.
export async function saveShopDetails(shopId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("shop_name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || name.length > 80) return { error: "Enter a shop name (up to 80 characters)." };
  if (address.length > 200) return { error: "Keep the address to 200 characters." };
  if (phone.length > 40) return { error: "Keep the phone number to 40 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("shops").update({ name, address, phone }).eq("id", shopId).select("id");
  if (error) return { error: "Couldn't save the shop details. Has 016 been run in Supabase?" };
  if (!data?.length) return { error: "Only the shop owner can change the shop details." };

  revalidatePath("/", "layout");
  return { saved: true };
}

// The note printed at the bottom of every claim slip. Owner only, as above.
export async function saveSlipNote(shopId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const note = String(formData.get("slip_note") ?? "").trim();
  if (note.length > 500) return { error: "Keep the note to 500 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("shops").update({ slip_note: note }).eq("id", shopId).select("id");
  if (error) return { error: "Couldn't save the note. Has 016 been run in Supabase?" };
  if (!data?.length) return { error: "Only the shop owner can change the claim slip." };

  revalidatePath("/", "layout");
  return { saved: true };
}

// The email they sign in with. This project has "Confirm email" off (see
// docs/SPEC.md, Login), so Supabase switches it straight away. If that
// setting is ever turned on, Supabase instead emails a link and only
// switches once it is clicked; the message below covers both.
export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };
  if (user.email === email) return { error: "That is already your email." };

  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  revalidatePath("/account");
  if (data.user?.email === email) {
    return { saved: true, message: `Done. From now on, sign in with ${email}.` };
  }
  return {
    saved: true,
    message: `Check ${email} for a confirmation link. Until you click it, you still sign in with your old email.`,
  };
}

// Anyone can change their own password, e.g. to replace the temporary
// one the owner set.
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Couldn't change your password. Please try again." };
  return { saved: true };
}
