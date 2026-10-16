"use server";

import { createClient } from "@/lib/supabase/server";
import { repairNumber, searchJobs, STATUSES, type Job, type Status } from "@/lib/jobs";

export type RepairHit = { id: string; number: string; device: string; customer: string; phone: string; status: Status; statusLabel: string };
export type CustomerHit = { key: string; name: string; phone: string; repairs: number; lastDevice: string };
export type SearchResults = { repairs: RepairHit[]; customers: CustomerHit[] };

// Global search (tickets 68, 80), for the Ctrl+K box: repairs by device,
// problem, customer, contact number or repair number, newest first, and
// the customers among them (one per contact number, with how many
// repairs they have). RLS only returns the signed-in person's shop.
export async function searchRepairs(query: string): Promise<SearchResults> {
  const q = query.trim().slice(0, 100);
  if (!q) return { repairs: [], customers: [] };
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, device, problem, customer_name, customer_phone, status, created_at")
    .order("created_at", { ascending: false });
  const found = searchJobs((data ?? []) as Job[], q);

  // Customers: only when the search looks like a person (their name or
  // number matched, not just a device).
  const byPhone = new Map<string, CustomerHit>();
  const words = q.toLowerCase().split(/\s+/);
  for (const j of found) {
    const aboutPerson = words.some(
      (w) => j.customer_name.toLowerCase().includes(w) || (w.replace(/\D/g, "").length >= 3 && j.customer_phone.replace(/\D/g, "").includes(w.replace(/\D/g, ""))),
    );
    if (!aboutPerson) continue;
    const key = j.customer_phone.replace(/\D/g, "") || j.customer_name.toLowerCase();
    const hit = byPhone.get(key);
    if (hit) hit.repairs += 1;
    else byPhone.set(key, { key, name: j.customer_name, phone: j.customer_phone, repairs: 1, lastDevice: j.device });
  }

  return {
    repairs: found.slice(0, 8).map((j) => ({
      id: j.id,
      number: repairNumber(j.id),
      device: j.device,
      customer: j.customer_name,
      phone: j.customer_phone,
      status: j.status,
      statusLabel: STATUSES.find((s) => s.value === j.status)?.label ?? j.status,
    })),
    customers: [...byPhone.values()].slice(0, 4),
  };
}
