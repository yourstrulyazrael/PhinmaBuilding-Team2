/**
 * The time periods Reports & analytics can show (tickets 26, 33): Today,
 * the last 7 days, the last 30 days, or a whole month.
 * All dates are Manila dates, "YYYY-MM-DD".
 *
 * Every number, chart and table on those pages uses the same period,
 * so they always agree.
 */
import { addDays } from "@/lib/workspace";

export const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
] as const;

export type PresetKey = (typeof PRESETS)[number]["key"];

export type Period = {
  key: string; // "today" | "7d" | "30d" | "2026-10"
  from: string; // first day, inclusive
  to: string; // last day, inclusive
  label: string; // "Last 7 days"
  // Today is charted hour by hour; longer periods day by day.
  bucket: "hour" | "day";
};

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// "2026-10" -> "October 2026"
export function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Reads ?period=… from the address. Unknown values fall back to the
 * default. Months are only accepted where `allowMonth` is true.
 */
export function periodFrom(value: unknown, today: string, fallback: PresetKey, allowMonth = false): Period {
  if (allowMonth && isMonthKey(value)) {
    const next = addDays(`${value}-28`, 4).slice(0, 7); // a day in the following month
    return {
      key: value,
      from: `${value}-01`,
      to: addDays(`${next}-01`, -1),
      label: monthLabel(value),
      bucket: "day",
    };
  }
  const key = PRESETS.some((p) => p.key === value) ? (value as PresetKey) : fallback;
  if (key === "today") return { key, from: today, to: today, label: "Today", bucket: "hour" };
  const days = key === "7d" ? 7 : 30;
  return { key, from: addDays(today, -(days - 1)), to: today, label: `Last ${days} days`, bucket: "day" };
}

export function inPeriod(date: string, period: Period) {
  return date >= period.from && date <= period.to;
}
