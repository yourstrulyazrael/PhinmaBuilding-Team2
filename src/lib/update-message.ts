import { formatPeso, statusLabel, type Job } from "@/lib/jobs";

/**
 * The ready-made message the technician pastes into Messenger.
 *
 * It only takes the fields listed below, so the customer's name and
 * phone number cannot end up in it by accident.
 */
export function updateMessage(
  job: Pick<Job, "device" | "status" | "initial_quote" | "revised_estimate">,
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
  }
  lines.push("", `Track your repair anytime: ${trackingUrl}`);
  return lines.join("\n");
}
