/**
 * Shared facts about repair jobs, used by every screen that shows one.
 *
 * The status values must match the list allowed by the `jobs` table in
 * supabase/sql/003-create-jobs.sql.
 */

export const STATUSES = [
  { value: "received", label: "Received" },
  { value: "diagnosing", label: "Diagnosing" },
  { value: "waiting_for_parts", label: "Waiting for parts" },
  { value: "repairing", label: "Repairing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "picked_up", label: "Picked up" },
] as const;

export type Status = (typeof STATUSES)[number]["value"];

export type Job = {
  id: string;
  customer_name: string;
  customer_phone: string;
  device: string;
  problem: string;
  initial_quote: number;
  revised_estimate: number | null;
  notes: string;
  parts_replaced: string;
  status: Status;
  promised_date: string; // "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
};

export function statusLabel(status: Status) {
  return STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Colours for each status badge.
export const STATUS_STYLES: Record<Status, string> = {
  received: "bg-slate-100 text-slate-700",
  diagnosing: "bg-indigo-50 text-tertiary",
  waiting_for_parts: "bg-amber-50 text-amber-800",
  repairing: "bg-muted text-primary",
  ready_for_pickup: "bg-primary text-primary-foreground",
  picked_up: "bg-slate-100 text-slate-500",
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
