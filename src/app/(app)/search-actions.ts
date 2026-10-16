"use server";

import { createClient } from "@/lib/supabase/server";
import { repairNumber, searchJobs, STATUSES, type Job } from "@/lib/jobs";

export type RepairHit = { id: string; number: string; device: string; customer: string; status: string };

// The command palette's repair search (ticket 68): device, problem,
// customer, contact number or repair number (ZR-…). RLS only returns the
// signed-in person's shop, so nobody can search another shop's repairs.
export async function searchRepairs(query: string): Promise<RepairHit[]> {
  const q = query.trim().slice(0, 100);
  if (!q) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, device, problem, customer_name, customer_phone, status, created_at")
    .order("created_at", { ascending: false });
  return searchJobs((data ?? []) as Job[], q)
    .slice(0, 8)
    .map((j) => ({
      id: j.id,
      number: repairNumber(j.id),
      device: j.device,
      customer: j.customer_name,
      status: STATUSES.find((s) => s.value === j.status)?.label ?? j.status,
    }));
}
