"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/jobs";

export type BulkResult = { error?: string; changed?: number };

const MAX = 100;
const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// Statuses that can be set on many repairs at once (ticket 71). Picked up
// needs a payment each, cancelling asks "Are you sure?" each, and warranty
// is only for picked-up repairs, so those are one at a time.
const BULK = new Set(STATUSES.map((s) => s.value as string).filter((s) => !["picked_up", "cancelled", "warranty"].includes(s)));

// Several repairs to one status, in one update. RLS only matches the
// repairs this person may change, so "changed" may be fewer than asked.
export async function bulkSetStatus(ids: string[], status: string): Promise<BulkResult> {
  if (!BULK.has(status)) return { error: "Change that status one repair at a time." };
  const list = ids.filter(isId).slice(0, MAX);
  if (list.length === 0) return { error: "Select some repairs first." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status })
    .in("id", list)
    .not("status", "in", "(picked_up,cancelled)")
    .select("id");
  if (error) return { error: "Couldn't change them. Please try again." };
  revalidatePath("/");
  return { changed: data?.length ?? 0 };
}

// The owner hands several repairs to one person. The database checks
// each one (reassign_job, sql/027).
export async function bulkReassign(ids: string[], staffId: string): Promise<BulkResult> {
  const list = ids.filter(isId).slice(0, MAX);
  if (list.length === 0) return { error: "Select some repairs first." };
  if (!isId(staffId)) return { error: "Choose who to hand them to." };

  const supabase = await createClient();
  const results = await Promise.all(list.map((id) => supabase.rpc("reassign_job", { job_id: id, staff_id: staffId })));
  const failed = results.find((r) => r.error);
  revalidatePath("/", "layout");
  const changed = results.filter((r) => !r.error).length;
  if (failed && changed === 0) return { error: failed.error!.message };
  return { changed };
}
