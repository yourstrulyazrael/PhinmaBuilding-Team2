import type { SupabaseClient } from "@supabase/supabase-js";

// Three roles (ticket 83), most authority first. "apprentice" is Staff.
export type Role = "owner" | "lead" | "apprentice";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  lead: "Lead technician",
  apprentice: "Staff",
};

// The owner or a lead technician: works on any repair, answers staff's
// quote proposals and requests, reassigns repairs, adds Staff. The
// database has the same rule (i_lead_my_shop, supabase/sql/032).
export function isManager(role: Role | undefined | null) {
  return role === "owner" || role === "lead";
}

export type MyShop = {
  id: string;
  name: string;
  role: Role;
  // May set the revised estimate: always for the owner and leads; for
  // staff, if allowed (tickets 23, 83).
  canReviseEstimate: boolean;
  ownerName: string;
  ownerContact: string;
  // Set by the owner on the Account page (ticket 34); "" when not set.
  address: string;
  phone: string;
  slipNote: string;
  // The shop's currency, e.g. "PHP" (ticket 54); "PHP" before 026.
  currency: string;
  // Opening hours ("" if not set) and warranty days (30 by default; 0 =
  // none), set on Account (tickets 56–57); defaults before 027.
  hours: string;
  warrantyDays: number;
  // The number customers should call: the shop phone, or the owner's.
  contact: string;
};

type Membership = {
  role: Role;
  can_revise_estimate?: boolean;
  shops: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    slip_note?: string;
    currency?: string;
    hours?: string;
    warranty_days?: number;
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
    // "*" rather than naming columns, so a column added later (or not yet
    // added, before its SQL file is run) can never break this query,
    // which every signed-in page depends on.
    .select("*, shops (*, owner:technicians!shops_owner_id_fkey (display_name, contact_number))")
    .eq("technician_id", userId)
    .maybeSingle<Membership>();
  if (!membership?.shops) return null;

  const shop = membership.shops;
  const ownerContact = shop.owner?.contact_number ?? "";
  const phone = shop.phone?.trim() ?? "";
  return {
    id: shop.id,
    name: shop.name,
    role: membership.role,
    canReviseEstimate: isManager(membership.role) || membership.can_revise_estimate === true,
    ownerName: shop.owner?.display_name ?? "",
    ownerContact,
    address: shop.address ?? "",
    phone,
    slipNote: shop.slip_note ?? "",
    currency: shop.currency ?? "PHP",
    hours: shop.hours ?? "",
    warrantyDays: shop.warranty_days ?? 30,
    contact: phone || ownerContact,
  };
}
