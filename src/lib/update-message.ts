import { formatDate, formatPeso, statusLabel, type Job } from "@/lib/jobs";

/**
 * The ready-made message the technician pastes into Messenger.
 *
 * It only takes the fields listed below, so the customer's name and
 * phone number cannot end up in it by accident.
 */
export function updateMessage(
  job: Pick<Job, "device" | "status" | "initial_quote" | "revised_estimate" | "estimate_status" | "parts_total">,
  trackingUrl: string,
) {
  const lines = [
    `Hi! Here's an update on your ${job.device} repair.`,
    "",
    `Status: ${statusLabel(job.status)}`,
    `Initial quote: ${formatPeso(job.initial_quote)}`,
  ];
  if (job.revised_estimate !== null) {
    lines.push(`Revised quote: ${formatPeso(job.revised_estimate)}`);
  }
  // Parts are charged on top of the quote (ticket 47).
  const parts = Number(job.parts_total ?? 0);
  if (parts > 0) {
    lines.push(`Parts: ${formatPeso(parts)}`);
    lines.push(`Total: ${formatPeso(Number(job.revised_estimate ?? job.initial_quote) + parts)}`);
  }
  if (job.revised_estimate !== null && job.estimate_status === "pending") {
    lines.push("Please approve the revised quote on your tracking page so we can continue.");
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
    `Hi! Sorry, your ${job.device} repair is taking longer than our estimated completion date (${formatDate(job.promised_date)}).`,
    `It's currently at: ${statusLabel(job.status)}. We'll let you know as soon as it's ready.`,
    "",
    `Track your repair anytime: ${trackingUrl}`,
  ].join("\n");
}

/**
 * "It's ready" (ticket 56), shown on the repair page as soon as it's
 * marked Ready for pickup: what to pay, where and when to come. Same rule
 * as above: no customer name or number, and the shop's details only.
 */
export function readyMessage(
  job: Pick<Job, "device" | "initial_quote" | "revised_estimate" | "parts_total">,
  shop: { name: string; address: string; hours: string },
  trackingUrl: string,
) {
  const total = Number(job.revised_estimate ?? job.initial_quote) + Number(job.parts_total ?? 0);
  const lines = [
    `Hi! Good news: your ${job.device} is ready for pickup at ${shop.name}.`,
    "",
    `Total to pay: ${formatPeso(total)}`,
  ];
  if (shop.address) lines.push(`Where: ${shop.address}`);
  if (shop.hours) lines.push(`Open: ${shop.hours}`);
  lines.push("", "Please bring your claim slip.", `Details: ${trackingUrl}`);
  return lines.join("\n");
}
