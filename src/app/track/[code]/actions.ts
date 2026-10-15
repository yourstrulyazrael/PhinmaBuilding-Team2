"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTrackingCode } from "@/lib/jobs";

export type CustomerActionResult = { error?: string };

// The customer's two actions on their tracking page. No login: the
// tracking code in the link is what proves it is their repair. Each
// database function does only its one job, on that one job.

// Declining needs a reason (ticket 41), so the shop knows what to do next.
export async function answerEstimate(code: string, approve: boolean, reason = ""): Promise<CustomerActionResult> {
  if (!isTrackingCode(code)) return { error: "This link isn't valid." };
  const why = reason.trim();
  if (!approve && !why) return { error: "Please tell the shop why you are declining." };
  if (why.length > 300) return { error: "Please keep the reason under 300 characters." };
  const supabase = await createClient();
  let { error } = await supabase.rpc("answer_estimate", { code, approve, reason: approve ? "" : why });
  // Before 021 is run, only the old two-argument function exists
  // (PGRST202 = "no such function"). Answer anyway rather than leave the
  // customer stuck; the reason is just not saved until then.
  if (error?.code === "PGRST202") {
    ({ error } = await supabase.rpc("answer_estimate", { code, approve }));
  }
  // The function's own messages are written for customers.
  if (error) return { error: error.message };
  revalidatePath(`/track/${code}`);
  // Back to their page with a "thank you" that says what they chose
  // (ticket 52), instead of the question just disappearing.
  redirect(`/track/${code}?answered=${approve ? "approved" : "declined"}`);
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
