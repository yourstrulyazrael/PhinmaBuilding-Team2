/**
 * Parts and stock (tickets 27–29). The database keeps the numbers right
 * (supabase/sql/013-inventory.sql); this file only works out what to
 * show from them.
 */
import type { Period } from "@/lib/periods";
import { manilaDate } from "@/lib/workspace";

export type Part = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  low_stock_at: number;
  active: boolean;
  created_at: string;
};

export type Movement = {
  id: string;
  part_id: string;
  change: number;
  reason: "restock" | "adjustment" | "used" | "returned";
  job_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type JobPart = {
  id: string;
  job_id: string;
  part_id: string;
  quantity: number;
  created_at: string;
};

export const REASON_LABELS: Record<Movement["reason"], string> = {
  restock: "Restock",
  adjustment: "Adjustment",
  used: "Used on a repair",
  returned: "Returned from a repair",
};

export type StockLevel = "ok" | "low" | "out" | "negative";

// Below zero means the count is off (someone used a part the app
// thought was gone): "Check count".
export function stockLevel(part: Pick<Part, "quantity" | "low_stock_at">): StockLevel {
  if (part.quantity < 0) return "negative";
  if (part.quantity === 0) return "out";
  if (part.quantity <= part.low_stock_at) return "low";
  return "ok";
}

// Active parts at or below their low-stock level, emptiest first.
export function lowStock(parts: Part[]) {
  return parts
    .filter((p) => p.active && stockLevel(p) !== "ok")
    .sort((a, b) => a.quantity - b.quantity);
}

export type PartUsage = { part: Part; quantity: number; repairs: number };

// The parts used most in a period: total quantity, and on how many
// repairs (ticket 29).
export function mostUsed(jobParts: JobPart[], parts: Part[], period: Period): PartUsage[] {
  const byId = new Map(parts.map((p) => [p.id, p]));
  const usage = new Map<string, { quantity: number; jobs: Set<string> }>();
  for (const jp of jobParts) {
    const day = manilaDate(jp.created_at);
    if (day < period.from || day > period.to) continue;
    const entry = usage.get(jp.part_id) ?? { quantity: 0, jobs: new Set<string>() };
    entry.quantity += jp.quantity;
    entry.jobs.add(jp.job_id);
    usage.set(jp.part_id, entry);
  }
  return [...usage.entries()]
    .flatMap(([id, u]) => {
      const part = byId.get(id);
      return part ? [{ part, quantity: u.quantity, repairs: u.jobs.size }] : [];
    })
    .sort((a, b) => b.quantity - a.quantity || b.repairs - a.repairs)
    .slice(0, 10);
}
