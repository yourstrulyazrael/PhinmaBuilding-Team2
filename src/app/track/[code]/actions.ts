"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTrackingCode } from "@/lib/jobs";

export type CustomerActionResult = { error?: string };

// The customer's two actions on their tracking page. No login: the
// tracking code in the link is what proves it is their repair. Each
// database function does only its one job, on that one job.

export async function answerEstimate(code: string, approve: boolean): Promise<CustomerActionResult> {
  if (!isTrackingCode(code)) return { error: "This link isn't valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_estimate", { code, approve });
  // The function's own messages are written for customers.
  if (error) return { error: error.message };
  revalidatePath(`/track/${code}`);
  return {};
}

export async function requestCancellation(code: string, reason: string): Promise<CustomerActionResult> {
  if (!isTrackingCode(code)) return { error: "This link isn't valid." };
  const trimmed = reason.trim();
  if (trimmed.length > 300) return { error: "Please keep the reason under 300 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_cancellation", { code, reason: trimmed });
  if (error) return { error: error.message };
  revalidatePath(`/track/${code}`);
  return {};
}
