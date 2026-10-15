/**
 * Shared facts about repair jobs, used by every screen that shows one.
 *
 * The status values must match the list allowed by the `jobs` table
 * (supabase/sql/008-estimate-cancel-payment.sql).
 */

export const STATUSES = [
  { value: "received", label: "Received" },
  { value: "diagnosing", label: "Diagnosing" },
  { value: "waiting_for_parts", label: "Waiting for parts" },
  { value: "repairing", label: "Repairing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "picked_up", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type Status = (typeof STATUSES)[number]["value"];

// Picked up and Cancelled are both "finished": they leave the open list,
// the counts and the reminders.
export function isFinished(status: Status) {
  return status === "picked_up" || status === "cancelled";
}

// How a customer can pay at pickup. E-wallet and card also need the last
// 4 digits of the reference number (ticket 20).
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", needsRef: false },
  { value: "ewallet", label: "E-wallet", needsRef: true },
  { value: "card", label: "Card", needsRef: true },
] as const;

// "other" only appears on payments recorded before ticket 20.
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"] | "other";

export function paymentLabel(method: PaymentMethod | null) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Other";
}

export function needsPaymentRef(method: string) {
  return PAYMENT_METHODS.some((m) => m.value === method && m.needsRef);
}

export type Job = {
  id: string;
  shop_id: string;
  handled_by: string; // who is responsible for the phone now
  quoted_by: string; // who gave the initial quote
  customer_name: string;
  customer_phone: string;
  device: string;
  problem: string;
  initial_quote: number;
  revised_estimate: number | null;
  // The customer's answer to the revised estimate (ticket 17). null =
  // nothing to answer.
  estimate_status: "pending" | "approved" | "declined" | null;
  estimate_answered_at: string | null;
  estimate_decline_reason?: string; // why the customer declined (ticket 41); after 021
  parts_total?: number | string; // parts used, at retail, kept by the database (ticket 47); after 023
  // A customer's cancellation request (ticket 18).
  cancel_requested_at: string | null;
  cancel_reason: string;
  // Recorded at pickup (ticket 19).
  amount_paid: number | null;
  payment_method: PaymentMethod | null;
  payment_ref: string | null; // last 4 digits, e-wallet and card only
  paid_at: string | null;
  notes: string;
  parts_replaced: string;
  status: Status;
  promised_date: string; // "YYYY-MM-DD"
  tracking_code: string;
  created_at: string;
  updated_at: string;
};

export function statusLabel(status: Status) {
  return STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Colours for each status badge.
export const STATUS_STYLES: Record<Status, string> = {
  received: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  diagnosing: "bg-indigo-50 text-tertiary dark:bg-indigo-950",
  waiting_for_parts: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  repairing: "bg-muted text-primary",
  ready_for_pickup: "bg-primary text-primary-foreground",
  picked_up: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

// A coloured dot for each status, used in the status menu. Same colour
// family as the badge, a bit stronger so it shows on a white or dark card.
export const STATUS_DOTS: Record<Status, string> = {
  received: "bg-slate-400",
  diagnosing: "bg-indigo-500 dark:bg-indigo-400",
  waiting_for_parts: "bg-amber-500",
  repairing: "bg-primary/60",
  ready_for_pickup: "bg-primary",
  picked_up: "bg-slate-300 dark:bg-slate-600",
  cancelled: "bg-red-500",
};

// ₱1,500 — no decimals unless there are centavos.
export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
  }).format(amount);
}

// "2026-10-18" -> "Oct 18, 2026". Read as a calendar date, so the time
// zone of the server cannot shift it by a day.
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Today's date in the Philippines as "YYYY-MM-DD". Vercel's servers run
// on UTC, which is 8 hours behind Manila.
export function todayInManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Ways the Jobs list can be ordered. The first one is the default.
export const SORTS = [
  { value: "promised", label: "Estimated completion" },
  { value: "newest", label: "Newest added" },
  { value: "oldest", label: "Oldest added" },
  { value: "customer", label: "Customer name" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

export function parseSort(value: unknown): Sort {
  return SORTS.find((s) => s.value === value)?.value ?? "promised";
}

// Jobs whose device, problem, customer name or phone contain the search
// words, ignoring upper/lower case. Every word must match somewhere,
// so "iphone maria" finds Maria's iPhone.
export function searchJobs(jobs: Job[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return jobs;
  return jobs.filter((job) => {
    const text = [job.device, job.problem, job.customer_name, job.customer_phone]
      .join(" ")
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

// A sorted copy; the original list is left alone.
export function sortJobs(jobs: Job[], sort: Sort) {
  const sorted = [...jobs];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "oldest":
      return sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "customer":
      return sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name, "en", { sensitivity: "base" }));
    default:
      return sorted.sort(
        (a, b) => a.promised_date.localeCompare(b.promised_date) || a.created_at.localeCompare(b.created_at),
      );
  }
}

// Tracking codes are 32 lowercase letters and digits (see
// supabase/sql/004-tracking-page.sql).
export function isTrackingCode(code: string) {
  return /^[0-9a-f]{32}$/.test(code);
}
