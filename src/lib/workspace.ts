/**
 * Everything the Workspace page works out from the technician's jobs.
 * No extra tables: customers, notifications and analytics are all
 * calculated from the `jobs` rows RLS already lets them read.
 */
import { STATUSES, type Job, type Status } from "@/lib/jobs";

// --- Small helpers ------------------------------------------------------

// A timestamp's calendar date in Manila, as "YYYY-MM-DD".
export function manilaDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Whole days between two "YYYY-MM-DD" dates.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// Past the promised date and the phone is not ready yet.
export function isLate(job: Job, today: string) {
  return job.status !== "picked_up" && job.status !== "ready_for_pickup" && job.promised_date < today;
}

// What the customer will actually pay: the revised estimate if there is one.
export function currentPrice(job: Job) {
  return Number(job.revised_estimate ?? job.initial_quote);
}

// --- Customers ----------------------------------------------------------

export type Customer = {
  key: string;
  name: string;
  phone: string;
  jobs: Job[];
  openCount: number;
  lastVisit: string; // created_at of their newest job
};

// Groups jobs by phone number. "0917 123 4567" and "09171234567" are
// the same person, so only the digits are compared.
export function groupCustomers(jobs: Job[]): Customer[] {
  const byPhone = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = job.customer_phone.replace(/\D/g, "") || job.customer_name.toLowerCase();
    byPhone.set(key, [...(byPhone.get(key) ?? []), job]);
  }
  return [...byPhone.entries()]
    .map(([key, list]) => {
      const newestFirst = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
      const latest = newestFirst[0]!;
      return {
        key,
        name: latest.customer_name,
        phone: latest.customer_phone,
        jobs: newestFirst,
        openCount: list.filter((j) => j.status !== "picked_up").length,
        lastVisit: latest.created_at,
      };
    })
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

// --- Notifications ------------------------------------------------------

export type Alert = {
  job: Job;
  kind: "overdue" | "ready" | "parts" | "estimate";
  message: string;
};

const PARTS_WAIT_DAYS = 3;

// Jobs that need the technician's attention, most urgent kind first.
export function attentionAlerts(jobs: Job[], today: string): Alert[] {
  const alerts: Alert[] = [];
  for (const job of jobs) {
    if (job.status === "picked_up") continue;
    if (isLate(job, today)) {
      const days = daysBetween(job.promised_date, today);
      alerts.push({ job, kind: "overdue", message: `${days} day${days === 1 ? "" : "s"} past the promised date` });
    }
    if (job.status === "ready_for_pickup") {
      const days = daysBetween(manilaDate(job.updated_at), today);
      alerts.push({
        job,
        kind: "ready",
        message: days === 0 ? "Ready today: let the customer know" : `Ready for ${days} day${days === 1 ? "" : "s"}, not collected yet`,
      });
    }
    if (job.status === "waiting_for_parts") {
      const days = daysBetween(manilaDate(job.updated_at), today);
      if (days > PARTS_WAIT_DAYS) {
        alerts.push({ job, kind: "parts", message: `Waiting for parts for ${days} days` });
      }
    }
    if (job.revised_estimate !== null && Number(job.revised_estimate) > Number(job.initial_quote)) {
      alerts.push({ job, kind: "estimate", message: "Revised estimate is above the quote: confirm with the customer" });
    }
  }
  const order: Alert["kind"][] = ["overdue", "ready", "parts", "estimate"];
  return alerts.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

// The panel under the tabs: late jobs, then phones waiting to be collected.
export function overdueAndAwaiting(jobs: Job[], today: string) {
  const late = jobs.filter((j) => isLate(j, today));
  const awaiting = jobs.filter((j) => j.status === "ready_for_pickup");
  return [...late, ...awaiting].sort((a, b) => a.promised_date.localeCompare(b.promised_date));
}

// --- Analytics ----------------------------------------------------------

export function analytics(jobs: Job[], today: string) {
  const month = today.slice(0, 7); // "YYYY-MM"
  const open = jobs.filter((j) => j.status !== "picked_up");
  const pickedUp = jobs.filter((j) => j.status === "picked_up");

  // We do not store a pickup time, so the last update of a picked-up
  // job stands in for it (marking "Picked up" is usually the last change).
  const turnarounds = pickedUp.map((j) => daysBetween(manilaDate(j.created_at), manilaDate(j.updated_at)));
  const avgTurnaround = turnarounds.length
    ? turnarounds.reduce((sum, d) => sum + d, 0) / turnarounds.length
    : null;

  const deviceCounts = new Map<string, { label: string; count: number }>();
  for (const job of jobs) {
    const key = job.device.trim().toLowerCase();
    const entry = deviceCounts.get(key) ?? { label: job.device.trim(), count: 0 };
    entry.count += 1;
    deviceCounts.set(key, entry);
  }

  return {
    receivedThisMonth: jobs.filter((j) => manilaDate(j.created_at).startsWith(month)).length,
    pickedUpThisMonth: pickedUp.filter((j) => manilaDate(j.updated_at).startsWith(month)).length,
    earnedThisMonth: pickedUp
      .filter((j) => manilaDate(j.updated_at).startsWith(month))
      .reduce((sum, j) => sum + currentPrice(j), 0),
    openCount: open.length,
    openValue: open.reduce((sum, j) => sum + currentPrice(j), 0),
    avgTurnaround,
    byStatus: STATUSES.map((s) => ({
      status: s.value as Status,
      label: s.label,
      count: jobs.filter((j) => j.status === s.value).length,
    })),
    topDevices: [...deviceCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
