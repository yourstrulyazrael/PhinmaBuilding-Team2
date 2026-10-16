"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// `field`: which box the error is about, so it shows under that box (ticket 75).
export type NewJobState = { error?: string; field?: string };

export async function createJob(
  _prev: NewJobState,
  formData: FormData,
): Promise<NewJobState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const job = {
    customer_name: text("customer_name"),
    customer_phone: text("customer_phone"),
    device: text("device"),
    problem: text("problem"),
    promised_date: text("promised_date"),
  };
  const quoteText = text("initial_quote");
  const initialQuote = Number(quoteText);

  // Check everything here so the technician gets a clear message. The
  // database checks the same rules again, in case this code has a bug.
  if (!job.customer_name) return { error: "Enter the customer's name.", field: "customer_name" };
  if (!job.customer_phone) return { error: "Enter the customer's contact number.", field: "customer_phone" };
  if (!job.device) return { error: "Enter the device, e.g. iPhone 12.", field: "device" };
  if (!job.problem) return { error: "Describe the problem.", field: "problem" };
  if (!quoteText || !Number.isFinite(initialQuote) || initialQuote < 0) {
    return { error: "Enter an initial quote of 0 or more.", field: "initial_quote" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(job.promised_date)) {
    return { error: "Pick an estimated completion date.", field: "promised_date" };
  }

  const supabase = await createClient();
  // technician_id and status are filled in by the database: the signed-
  // in technician, and "received".
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...job, initial_quote: initialQuote })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Straight to the claim slip, ready to hand to the customer.
  redirect(`/jobs/${data.id}/slip`);
}
