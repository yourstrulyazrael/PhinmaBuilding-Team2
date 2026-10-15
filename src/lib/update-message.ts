import { formatDate, formatPeso, statusLabel, type Job } from "@/lib/jobs";

/**
 * The ready-made message the technician pastes into Messenger.
 *
 * It only takes the fields listed below, so the customer's name and
 * phone number cannot end up in it by accident.
 */
export function updateMessage(
  job: Pick<Job, "device" | "status" | "initial_quote" | "revised_estimate" | "estimate_status">,
  trackingUrl: string,
) {
  const lines = [
    `Hi! Here's an update on your ${job.device} repair.`,
    "",
    `Status: ${statusLabel(job.status)}`,
    `Initial quote: ${formatPeso(job.initial_quote)}`,
  ];
  if (job.revised_estimate !== null) {
    lines.push(`Revised estimate: ${formatPeso(job.revised_estimate)}`);
    if (job.estimate_status === "pending") {
      lines.push("Please approve the new estimate on your tracking page so we can continue.");
    }
  }
  lines.push("", `Track your repair anytime: ${trackingUrl}`);
  return lines.join("\n");
}

/**
 * The apology the technician pastes into Messenger when a repair is
 * past its promised date (ticket 21). Same rule as above: built only
 * from these fields, so the customer's name and phone can't slip in.
 */
export function delayMessage(job: Pick<Job, "device" | "status" | "promised_date">, trackingUrl: string) {
  return [
    `Hi! Sorry, your ${job.device} repair is taking longer than we promised (${formatDate(job.promised_date)}).`,
    `It's currently at: ${statusLabel(job.status)}. We'll let you know as soon as it's ready.`,
    "",
    `Track your repair anytime: ${trackingUrl}`,
  ].join("\n");
}
