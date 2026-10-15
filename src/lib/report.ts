/**
 * The report (tickets 25–26): one period's summary (today, the last 7
 * or 30 days, or a month) and every job received in it. Worked out from the shop's jobs, like the rest
 * of the Workspace. Used by the report page (PDF) and the Excel export,
 * so both always show the same numbers.
 *
 * Deliberately no customer phone numbers: a report gets saved, printed
 * and passed around.
 */
import { isFinished, paymentLabel, PAYMENT_METHODS, statusLabel, STATUSES, type Job } from "@/lib/jobs";
import { daysBetween, manilaDate, paidFor, pickedUpOn } from "@/lib/workspace";
import type { Period } from "@/lib/periods";

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
  periodKey: string; // "today" | "7d" | "30d" | "2026-10"
  periodLabel: string; // "Last 7 days", "October 2026"
  received: number;
  pickedUp: number;
  cancelled: number;
  stillOpen: number; // of the jobs received in the period
  earned: number;
  avgTurnaround: number | null;
  byMethod: { label: string; count: number; total: number }[];
  byStatus: { label: string; count: number }[];
  rows: ReportRow[];
};

export function buildReport(jobs: Job[], period: Period, names: Map<string, string>): Report {
  const inPeriod = (date: string) => date >= period.from && date <= period.to;

  // Jobs that came in during the period: the table, and the status breakdown.
  const receivedJobs = jobs
    .filter((j) => inPeriod(manilaDate(j.created_at)))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Jobs that finished during the period (whenever they came in): the money.
  const pickedUpJobs = jobs.filter((j) => j.status === "picked_up" && inPeriod(pickedUpOn(j)));
  const cancelledJobs = jobs.filter((j) => j.status === "cancelled" && inPeriod(manilaDate(j.updated_at)));
  const paid = paidFor;

  const turnarounds = pickedUpJobs.map((j) => daysBetween(manilaDate(j.created_at), pickedUpOn(j)));

  const methods = [...PAYMENT_METHODS.map((m) => m.value as string), "other"];
  const byMethod = methods
    .map((method) => {
      const list = pickedUpJobs.filter((j) => (j.payment_method ?? "other") === method);
      return { label: paymentLabel(method as Job["payment_method"]), count: list.length, total: list.reduce((s, j) => s + paid(j), 0) };
    })
    .filter((m) => m.count > 0);

  return {
    periodKey: period.key,
    periodLabel: period.label,
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
