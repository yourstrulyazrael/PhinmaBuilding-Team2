import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "owner" | "apprentice";

export type MyShop = {
  id: string;
  name: string;
  role: Role;
  // May set the revised estimate: always for the owner; for staff, if
  // the owner allowed it (ticket 23).
  canReviseEstimate: boolean;
  ownerName: string;
  ownerContact: string;
};

/**
 * The signed-in person's shop, their role in it, and the owner's
 * contact (shown on claim slips). Null if they are not in a shop yet.
 *
 * RLS does the security: a person can only read their own shop and
 * their shopmates, so this cannot return anyone else's shop.
 */
export async function getMyShop(supabase: SupabaseClient, userId: string): Promise<MyShop | null> {
  const { data: membership } = await supabase
    .from("shop_members")
    // "*" rather than naming columns, so a column added later can never
    // break this query (which every signed-in page depends on).
    .select("*, shops (id, name, owner_id)")
    .eq("technician_id", userId)
    .maybeSingle<{
      role: Role;
      can_revise_estimate?: boolean;
      shops: { id: string; name: string; owner_id: string } | null;
    }>();
  if (!membership?.shops) return null;

  const { data: owner } = await supabase
    .from("technicians")
    .select("display_name, contact_number")
    .eq("id", membership.shops.owner_id)
    .maybeSingle();

  return {
    id: membership.shops.id,
    name: membership.shops.name,
    role: membership.role,
    canReviseEstimate: membership.role === "owner" || membership.can_revise_estimate === true,
    ownerName: owner?.display_name ?? "",
    ownerContact: owner?.contact_number ?? "",
  };
}
