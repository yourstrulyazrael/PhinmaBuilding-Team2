/**
 * Everything the Workspace page works out from the technician's jobs.
 * No extra tables: customers, notifications and analytics are all
 * calculated from the `jobs` rows RLS already lets them read.
 */
import { formatPeso, isFinished, STATUSES, type Job, type Status } from "@/lib/jobs";
import type { Period } from "@/lib/periods";

// --- Small helpers ------------------------------------------------------

// A timestamp's calendar date in Manila, as "YYYY-MM-DD".
export function manilaDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Whole days between two "YYYY-MM-DD" dates.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// The "YYYY-MM-DD" date a number of days after another.
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Picked up and paid for, counting one that's back under warranty: its
// payment still belongs to the day it was first picked up (ticket 57).
export function wasPickedUp(job: Pick<Job, "status" | "amount_paid">) {
  return job.status === "picked_up" || (job.status === "warranty" && job.amount_paid !== null);
}

// The last day of a repair's warranty (ticket 57), as "YYYY-MM-DD": the
// pickup day (the payment, or the last update for older repairs) plus the
// shop's warranty days. Null before pickup, or if the shop gives none.
export function warrantyEnd(job: Pick<Job, "status" | "paid_at" | "updated_at">, days: number) {
  if (days <= 0) return null;
  const picked = job.paid_at ?? (job.status === "picked_up" || job.status === "warranty" ? job.updated_at : null);
  return picked ? addDays(manilaDate(picked), days) : null;
}

// Past the promised date and the phone is not ready yet.
export function isLate(job: Pick<Job, "status" | "promised_date">, today: string) {
  return !isFinished(job.status) && job.status !== "ready_for_pickup" && job.promised_date < today;
}

// When a job was picked up: the payment time (ticket 19), or for older
// jobs the last update, which is usually marking "Picked up".
export function pickedUpOn(job: Job) {
  return manilaDate(job.paid_at ?? job.updated_at);
}

// What the customer will actually pay: labour (the revised estimate if
// there is one, else the quote) plus the parts used.
export function currentPrice(job: Job) {
  return labourPrice(job) + partsTotal(job);
}

// The quote and any revised estimate are LABOUR; parts used are charged
// on top (ticket 47). currentPrice is what the customer pays: both.
export function labourPrice(job: Pick<Job, "initial_quote" | "revised_estimate">) {
  return Number(job.revised_estimate ?? job.initial_quote);
}

// Parts used on the repair, at retail. 0 before 023 is run.
export function partsTotal(job: Pick<Job, "parts_total">) {
  return Number(job.parts_total ?? 0);
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
        openCount: list.filter((j) => !isFinished(j.status)).length,
        lastVisit: latest.created_at,
      };
    })
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}

// --- Notifications ------------------------------------------------------

export type Alert = {
  job: Job;
  kind: "cancel" | "declined" | "approved" | "overdue" | "due_today" | "due_tomorrow" | "ready" | "parts" | "estimate";
  message: string;
};

const PARTS_WAIT_DAYS = 3;

// Who is looking: some reminders are only for the owner and the person
// handling the repair.
export type AlertViewer = { id: string; isOwner: boolean };

// Jobs that need the technician's attention, most urgent kind first.
export function attentionAlerts(jobs: Job[], today: string, viewer?: AlertViewer): Alert[] {
  const alerts: Alert[] = [];
  for (const job of jobs) {
    if (isFinished(job.status)) continue;
    if (job.cancel_requested_at) {
      alerts.push({
        job,
        kind: "cancel",
        message: job.cancel_reason ? `Customer asked to cancel: “${job.cancel_reason}”` : "Customer asked to cancel this repair",
      });
    }
    if (job.estimate_status === "declined") {
      alerts.push({
        job,
        kind: "declined",
        message: job.estimate_decline_reason
          ? `Customer declined the revised quote: “${job.estimate_decline_reason}”`
          : "Customer declined the revised quote",
      });
    }
    // The customer said yes (ticket 40): tell the owner and whoever is
    // handling the repair, on the day they answered and the day after.
    // Reminders are worked out fresh each time, so it then drops off by
    // itself rather than needing to be dismissed.
    if (
      job.estimate_status === "approved" &&
      job.estimate_answered_at &&
      manilaDate(job.estimate_answered_at) >= addDays(today, -1) &&
      viewer &&
      (viewer.isOwner || job.handled_by === viewer.id)
    ) {
      const amount = job.revised_estimate === null ? "" : ` of ${formatPeso(job.revised_estimate)}`;
      alerts.push({
        job,
        kind: "approved",
        message: `Customer approved the revised quote${amount}: you can carry on with the repair`,
      });
    }
    if (isLate(job, today)) {
      const days = daysBetween(job.promised_date, today);
      alerts.push({ job, kind: "overdue", message: `${days} day${days === 1 ? "" : "s"} past the estimated completion date` });
    }
    // A heads-up before it is late: promised today or tomorrow, and the
    // phone is not ready yet.
    if (job.status !== "ready_for_pickup") {
      if (job.promised_date === today) {
        alerts.push({ job, kind: "due_today", message: "Estimated completion is today, and not ready yet" });
      } else if (job.promised_date === addDays(today, 1)) {
        alerts.push({ job, kind: "due_tomorrow", message: "Estimated completion is tomorrow, and not ready yet" });
      }
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
    if (job.estimate_status === "pending") {
      alerts.push({ job, kind: "estimate", message: "Waiting for the customer to approve the revised quote" });
    }
  }
  const order: Alert["kind"][] = ["cancel", "declined", "approved", "overdue", "due_today", "due_tomorrow", "ready", "parts", "estimate"];
  return alerts.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

// The panel under the tabs: late jobs, then phones waiting to be collected.
export function overdueAndAwaiting(jobs: Job[], today: string) {
  const late = jobs.filter((j) => isLate(j, today));
  const awaiting = jobs.filter((j) => j.status === "ready_for_pickup");
  return [...late, ...awaiting].sort((a, b) => a.promised_date.localeCompare(b.promised_date));
}

// --- Analytics ----------------------------------------------------------
//
// Everything is for one period (src/lib/periods.ts): jobs RECEIVED in
// it, and jobs PICKED UP in it. "Open repairs" is always right now.

export function analytics(jobs: Job[], period: Period) {
  const inside = (date: string) => date >= period.from && date <= period.to;
  const received = jobs.filter((j) => inside(manilaDate(j.created_at)));
  const pickedUp = jobs.filter((j) => wasPickedUp(j) && inside(pickedUpOn(j)));
  const open = jobs.filter((j) => !isFinished(j.status));

  const turnarounds = pickedUp.map((j) => daysBetween(manilaDate(j.created_at), pickedUpOn(j)));
  const avgTurnaround = turnarounds.length
    ? turnarounds.reduce((sum, d) => sum + d, 0) / turnarounds.length
    : null;

  const deviceCounts = new Map<string, { label: string; count: number }>();
  for (const job of received) {
    const key = job.device.trim().toLowerCase();
    const entry = deviceCounts.get(key) ?? { label: job.device.trim(), count: 0 };
    entry.count += 1;
    deviceCounts.set(key, entry);
  }

  return {
    received: received.length,
    pickedUp: pickedUp.length,
    // What was actually paid; older jobs without a payment record count
    // their final price.
    earned: pickedUp.reduce((sum, j) => sum + paidFor(j), 0),
    openCount: open.length,
    openValue: open.reduce((sum, j) => sum + currentPrice(j), 0),
    avgTurnaround,
    byStatus: STATUSES.map((s) => ({
      status: s.value as Status,
      label: s.label,
      count: received.filter((j) => j.status === s.value).length,
    })),
    topDevices: [...deviceCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

// What a picked-up job brought in: the amount paid, or its final price
// for older jobs from before payments were recorded.
export function paidFor(job: Job) {
  return Number(job.amount_paid ?? currentPrice(job));
}

export type TrendPoint = { key: string; label: string; received: number; pickedUp: number; earned: number };

// The hour (0–23) of a timestamp, in Manila.
function manilaHour(timestamp: string) {
  return (
    Number(new Date(timestamp).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" })) % 24
  );
}

/**
 * The points for the line charts: one per hour for Today (up to the
 * current hour), one per day otherwise. Each counts the jobs received,
 * the jobs picked up and the money earned in that hour or day.
 */
export function trend(jobs: Job[], period: Period, now = new Date().toISOString()): TrendPoint[] {
  const pickedUp = jobs.filter((j) => wasPickedUp(j));
  const pickupTime = (j: Job) => j.paid_at ?? j.updated_at;

  if (period.bucket === "hour") {
    const day = period.from;
    const lastHour = manilaDate(now) === day ? manilaHour(now) : 23;
    return Array.from({ length: lastHour + 1 }, (_, hour) => {
      const isHour = (ts: string) => manilaDate(ts) === day && manilaHour(ts) === hour;
      const out = pickedUp.filter((j) => isHour(pickupTime(j)));
      return {
        key: `${day} ${hour}`,
        label: `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`,
        received: jobs.filter((j) => isHour(j.created_at)).length,
        pickedUp: out.length,
        earned: out.reduce((s, j) => s + paidFor(j), 0),
      };
    });
  }

  const points: TrendPoint[] = [];
  for (let date = period.from; date <= period.to; date = addDays(date, 1)) {
    const out = pickedUp.filter((j) => manilaDate(pickupTime(j)) === date);
    points.push({
      key: date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      received: jobs.filter((j) => manilaDate(j.created_at) === date).length,
      pickedUp: out.length,
      earned: out.reduce((s, j) => s + paidFor(j), 0),
    });
  }
  return points;
}
