"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTemporaryClient } from "@/lib/supabase/temporary";
import { getMyShop } from "@/lib/shop";

export type AddStaffState = { error?: string; added?: string };

/**
 * The owner creates a staff member's account (ticket 22), in three steps:
 *   1. sign the new account up, in a temporary session (the owner stays
 *      signed in as themselves)
 *   2. save the new person's name and contact, as themselves (RLS only
 *      lets people write their own details)
 *   3. the owner adds them to the shop (the database only accepts the
 *      owner, and only a brand-new account that is in no shop)
 */
export async function addStaff(_prev: AddStaffState, formData: FormData): Promise<AddStaffState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const displayName = text("display_name");
  const contactNumber = text("contact_number");
  const email = text("email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!displayName || displayName.length > 80) return { error: "Enter their name (up to 80 characters)." };
  if (!contactNumber || contactNumber.length > 40) return { error: "Enter their contact number (up to 40 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a temporary password of at least 8 characters." };

  // Only the owner gets this far. The database checks again in step 3.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };
  const shop = await getMyShop(supabase, user.id);
  if (shop?.role !== "owner") return { error: "Only the shop owner can add staff." };

  // 1. Create the account.
  const temporary = createTemporaryClient();
  const { data: signUp, error: signUpError } = await temporary.auth.signUp({ email, password });
  if (signUpError) {
    return { error: /already|registered|exists/i.test(signUpError.message)
      ? "That email already has an account. Use a different email."
      : "Couldn't create the account. Please try again." };
  }
  // Supabase hides whether an email is taken: a taken email comes back
  // with no session and no identities.
  if (!signUp.session || !signUp.user || signUp.user.identities?.length === 0) {
    return { error: "That email already has an account. Use a different email." };
  }

  // 2. Their name and contact, saved as them.
  const { error: detailsError } = await temporary
    .from("technicians")
    .insert({ id: signUp.user.id, display_name: displayName, contact_number: contactNumber });
  await temporary.auth.signOut(); // end the temporary session straight away
  if (detailsError) return { error: "The account was created, but saving their details failed. Please try again." };

  // 3. Into the shop.
  const { error } = await supabase.rpc("add_staff", { staff_id: signUp.user.id });
  if (error) return { error: error.message };

  revalidatePath("/workspace");
  return { added: displayName };
}

// The owner allows (or stops) a staff member setting revised estimates
// (ticket 23). The database function refuses anyone but the owner.
export async function setEstimatePermission(staffId: string, allowed: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_estimate_permission", { staff_id: staffId, allowed });
  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return {};
}
