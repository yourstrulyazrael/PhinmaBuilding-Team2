/**
 * The monthly report (ticket 25): one month's summary and every job
 * received that month. Worked out from the shop's jobs, like the rest
 * of the Workspace. Used by the report page (PDF) and the Excel export,
 * so both always show the same numbers.
 *
 * Deliberately no customer phone numbers: a report gets saved, printed
 * and passed around.
 */
import { isFinished, paymentLabel, PAYMENT_METHODS, statusLabel, STATUSES, type Job } from "@/lib/jobs";
import { currentPrice, daysBetween, manilaDate, pickedUpOn } from "@/lib/workspace";

export type ReportRow = {
  received: string; // "YYYY-MM-DD"
  device: string;
  problem: string;
  customer: string;
  status: string;
  initialQuote: number;
  revisedEstimate: number | null;
  paid: number | null;
  method: string;
  ref: string;
  handledBy: string;
};

export type Report = {
  month: string; // "YYYY-MM"
  monthLabel: string; // "October 2026"
  received: number;
  pickedUp: number;
  cancelled: number;
  stillOpen: number; // of the jobs received this month
  earned: number;
  avgTurnaround: number | null;
  byMethod: { label: string; count: number; total: number }[];
  byStatus: { label: string; count: number }[];
  rows: ReportRow[];
};

// "2026-10" -> "October 2026"
export function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function buildReport(jobs: Job[], month: string, names: Map<string, string>): Report {
  const inMonth = (date: string) => date.startsWith(month);

  // Jobs that came in this month: the table, and the status breakdown.
  const receivedJobs = jobs
    .filter((j) => inMonth(manilaDate(j.created_at)))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Jobs that finished this month (whenever they came in): the money.
  const pickedUpJobs = jobs.filter((j) => j.status === "picked_up" && inMonth(pickedUpOn(j)));
  const cancelledJobs = jobs.filter((j) => j.status === "cancelled" && inMonth(manilaDate(j.updated_at)));
  const paid = (j: Job) => Number(j.amount_paid ?? currentPrice(j));

  const turnarounds = pickedUpJobs.map((j) => daysBetween(manilaDate(j.created_at), pickedUpOn(j)));

  const methods = [...PAYMENT_METHODS.map((m) => m.value as string), "other"];
  const byMethod = methods
    .map((method) => {
      const list = pickedUpJobs.filter((j) => (j.payment_method ?? "other") === method);
      return { label: paymentLabel(method as Job["payment_method"]), count: list.length, total: list.reduce((s, j) => s + paid(j), 0) };
    })
    .filter((m) => m.count > 0);

  return {
    month,
    monthLabel: monthLabel(month),
    received: receivedJobs.length,
    pickedUp: pickedUpJobs.length,
    cancelled: cancelledJobs.length,
    stillOpen: receivedJobs.filter((j) => !isFinished(j.status)).length,
    earned: pickedUpJobs.reduce((s, j) => s + paid(j), 0),
    avgTurnaround: turnarounds.length ? turnarounds.reduce((s, d) => s + d, 0) / turnarounds.length : null,
    byMethod,
    byStatus: STATUSES.map((s) => ({
      label: s.label,
      count: receivedJobs.filter((j) => j.status === s.value).length,
    })).filter((s) => s.count > 0),
    rows: receivedJobs.map((j) => ({
      received: manilaDate(j.created_at),
      device: j.device,
      problem: j.problem,
      customer: j.customer_name,
      status: statusLabel(j.status),
      initialQuote: Number(j.initial_quote),
      revisedEstimate: j.revised_estimate === null ? null : Number(j.revised_estimate),
      paid: j.amount_paid === null ? null : Number(j.amount_paid),
      method: j.payment_method ? paymentLabel(j.payment_method) : "",
      ref: j.payment_ref ? `…${j.payment_ref}` : "",
      handledBy: names.get(j.handled_by) ?? "",
    })),
  };
}
