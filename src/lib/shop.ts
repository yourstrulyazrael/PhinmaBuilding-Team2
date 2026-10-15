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

type Membership = {
  role: Role;
  can_revise_estimate?: boolean;
  shops: {
    id: string;
    name: string;
    owner: { display_name: string; contact_number: string } | null;
  } | null;
};

/**
 * The signed-in person's shop, their role in it, and the owner's
 * contact (shown on claim slips). Null if they are not in a shop yet.
 *
 * One trip to the database: the shop and its owner's details come back
 * with the membership. RLS does the security: a person can only read
 * their own shop and their shopmates, so this cannot return anyone
 * else's shop. Pages get this through getShop() in session.ts, so it
 * runs once per page load.
 */
export async function getMyShop(supabase: SupabaseClient, userId: string): Promise<MyShop | null> {
  const { data: membership } = await supabase
    .from("shop_members")
    // "*" rather than naming member columns, so a column added later can
    // never break this query (which every signed-in page depends on).
    .select("*, shops (id, name, owner:technicians!shops_owner_id_fkey (display_name, contact_number))")
    .eq("technician_id", userId)
    .maybeSingle<Membership>();
  if (!membership?.shops) return null;

  return {
    id: membership.shops.id,
    name: membership.shops.name,
    role: membership.role,
    canReviseEstimate: membership.role === "owner" || membership.can_revise_estimate === true,
    ownerName: membership.shops.owner?.display_name ?? "",
    ownerContact: membership.shops.owner?.contact_number ?? "",
  };
}
