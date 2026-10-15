"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { needsPaymentRef, PAYMENT_METHODS, STATUSES } from "@/lib/jobs";

export type ActionResult = { error?: string; saved?: boolean };

// One-tap status change. Any status may follow any other: the
// technician decides, not a fixed sequence.
export async function setStatus(jobId: string, status: string): Promise<ActionResult> {
  if (!STATUSES.some((s) => s.value === status)) {
    return { error: "That is not a valid status." };
  }
  // Picked up always goes through recordPickup, so the payment is saved.
  if (status === "picked_up") return { error: "Record the payment to mark it picked up." };

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

// Marks the job Picked up and records the payment, in one update, so a
// pickup is never saved without its payment (ticket 19). The database
// stamps paid_at itself.
export async function recordPickup(
  jobId: string,
  amount: number,
  method: string,
  ref: string,
): Promise<ActionResult> {
  if (!Number.isFinite(amount) || amount < 0 || amount > 99_999_999.99) {
    return { error: "Enter the amount paid, ₱0 or more." };
  }
  if (!PAYMENT_METHODS.some((m) => m.value === method)) {
    return { error: "Choose how the customer paid." };
  }
  // E-wallet and card: the last 4 digits of the reference. Cash: none.
  // The database checks the same rule.
  const paymentRef = needsPaymentRef(method) ? ref.trim() : null;
  if (paymentRef !== null && !/^[0-9]{4}$/.test(paymentRef)) {
    return { error: "Enter the last 4 digits of the reference number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "picked_up", amount_paid: amount, payment_method: method, payment_ref: paymentRef })
    .eq("id", jobId)
    .select("id");
  if (error) return { error: "Couldn't save the payment. Please try again." };
  if (!data?.length) return { error: "You can only change repairs you are handling." };

  revalidatePath("/");
  revalidatePath(`/jobs/${jobId}`);
  return { saved: true };
}

// "Keep repairing": clears the customer's cancellation request. The
// database only lets the shop clear a request, never make one.
export async function dismissCancelRequest(jobId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ cancel_requested_at: null })
    .eq("id", jobId)
    .select("id");
  if (error) return { error: "Couldn't update the repair. Please try again." };
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
    return { error: "Enter a revised quote of ₱0 or more, or leave it empty." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(promisedDate)) {
    return { error: "Pick an estimated completion date." };
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

// Records a part used on this repair (ticket 28). The database deducts
// the stock and only allows the owner or the job's handler.
export async function addJobPart(jobId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const partId = String(formData.get("part_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  if (!partId) return { error: "Choose a part." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { error: "Enter a quantity from 1 to 99." };

  const supabase = await createClient();
  const { error } = await supabase.from("job_parts").insert({ job_id: jobId, part_id: partId, quantity });
  if (error) {
    return {
      error: /row-level security|policy/i.test(error.message)
        ? "You can only record parts on repairs you are handling."
        : "Couldn't record the part. Please try again.",
    };
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/inventory");
  return { saved: true };
}

// Removes a part recorded by mistake; the database puts the stock back.
export async function removeJobPart(jobPartId: string, jobId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_parts").delete().eq("id", jobPartId).select("id");
  if (error) return { error: "Couldn't remove the part. Please try again." };
  if (!data?.length) return { error: "You can only change parts on repairs you are handling." };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/inventory");
  return { saved: true };
}

// Staff propose a revised estimate on a repair they handle (ticket 39).
// The database checks they handle it, can't set it themselves, and that
// no other proposal is waiting on this repair.
export async function proposeRevisedEstimate(jobId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isFinite(amount) || amount < 0) return { error: "Enter the new amount in pesos." };
  if (reason.length < 10 || reason.length > 500) return { error: "Give a reason of 10 to 500 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_revised_estimate", { job_id: jobId, amount, reason });
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/", "layout"); // the owner's bell
  return { saved: true };
}

// The owner approves (the amount becomes the revised estimate and the
// customer is asked to accept it) or rejects a proposal, with a note.
export async function decideRevisedEstimate(
  proposalId: string,
  jobId: string,
  approve: boolean,
  note: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_revised_estimate", {
    proposal_id: proposalId,
    approve,
    note: note.trim().slice(0, 300),
  });
  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/", "layout");
  return { saved: true };
}
