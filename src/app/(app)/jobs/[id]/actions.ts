"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/jobs";

export type ActionResult = { error?: string; saved?: boolean };

// One-tap status change. Any status may follow any other: the
// technician decides, not a fixed sequence.
export async function setStatus(jobId: string, status: string): Promise<ActionResult> {
  if (!STATUSES.some((s) => s.value === status)) {
    return { error: "That is not a valid status." };
  }

  const supabase = await createClient();
  // RLS only lets someone update jobs they may change (the owner: any job
  // in the shop; anyone else: jobs they handle). For any other
  // job this matches no rows, so we check that one row came back.
  const { data, error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can only change repairs you are handling." };

  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  return { saved: true };
}

// Saves the customer-visible details from the Job detail form.
export async function updateJobDetails(
  jobId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const notes = text("notes");
  const partsReplaced = text("parts_replaced");
  const promisedDate = text("promised_date");
  const revisedText = text("revised_estimate");
  // Empty means "no revised estimate".
  const revisedEstimate = revisedText === "" ? null : Number(revisedText);

  if (notes.length > 2000) return { error: "Keep notes under 2,000 characters." };
  if (partsReplaced.length > 500) return { error: "Keep parts replaced under 500 characters." };
  if (revisedEstimate !== null && (!Number.isFinite(revisedEstimate) || revisedEstimate < 0)) {
    return { error: "Enter a revised estimate of ₱0 or more, or leave it empty." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(promisedDate)) {
    return { error: "Pick a promised date." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({
      notes,
      parts_replaced: partsReplaced,
      promised_date: promisedDate,
      // Only the owner's form has this box; the database refuses an
      // apprentice changing it anyway.
      ...(formData.has("revised_estimate") ? { revised_estimate: revisedEstimate } : {}),
    })
    .eq("id", jobId)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can only change repairs you are handling." };

  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  return { saved: true };
}
