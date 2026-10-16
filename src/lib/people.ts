import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/lib/jobs";

/**
 * Who is looking, and the names of everyone in their shop (ticket 13).
 * Used to show "Handled by" and "Quoted by", and to show staff which
 * jobs they can change.
 */
export type Viewer = {
  id: string;
  isOwner: boolean;
  // Owner or lead technician (ticket 83): may change any repair.
  canManage: boolean;
  names: Record<string, string>; // technician id -> display name
};

// RLS only returns the viewer's shopmates, so this is their shop's names.
export async function loadNames(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.from("technicians").select("id, display_name");
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, p.display_name as string]));
}

// The same rule the database enforces: the owner and lead technicians
// can change any job; staff only the jobs they handle.
export function canChange(job: Pick<Job, "handled_by">, viewer: Viewer) {
  return viewer.canManage || job.handled_by === viewer.id;
}

export function nameOf(id: string, viewer: Viewer) {
  return viewer.names[id] ?? "Someone";
}
