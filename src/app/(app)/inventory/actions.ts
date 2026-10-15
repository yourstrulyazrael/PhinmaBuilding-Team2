"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";

export type FormState = { error?: string; done?: string };

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

function readNumber(value: string) {
  return value === "" ? NaN : Number(value);
}

// Shared checks for a part's details. The database checks them again.
function readPart(formData: FormData) {
  const sku = text(formData, "sku");
  const name = text(formData, "name");
  const cost = readNumber(text(formData, "cost"));
  const retail = readNumber(text(formData, "retail_price"));
  const lowStockAt = readNumber(text(formData, "low_stock_at"));
  if (!sku || sku.length > 40) return { error: "Enter a SKU (up to 40 characters)." };
  if (!name || name.length > 100) return { error: "Enter the part name (up to 100 characters)." };
  if (!Number.isFinite(cost) || cost < 0 || cost > 99_999_999.99) return { error: "Enter a cost of ₱0 or more." };
  if (!Number.isFinite(retail) || retail < 0 || retail > 99_999_999.99) return { error: "Enter a retail price of ₱0 or more." };
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0 || lowStockAt > 9999) {
    return { error: "Enter a low-stock level: a whole number, 0 or more." };
  }
  return { sku, name, cost, retail, lowStockAt };
}

function friendly(message: string) {
  if (/duplicate|unique/i.test(message)) return "Another part already uses that SKU.";
  if (/row-level security|policy/i.test(message)) return "Only the shop owner can do that.";
  return "Couldn't save. Please try again.";
}

// The owner adds a part. Its starting stock is recorded as a restock,
// so it shows in the history like every other change.
export async function addPart(_prev: FormState, formData: FormData): Promise<FormState> {
  const part = readPart(formData);
  if ("error" in part) return { error: part.error };
  const starting = readNumber(text(formData, "starting"));
  if (!Number.isInteger(starting) || starting < 0 || starting > 9999) {
    return { error: "Enter the starting stock: a whole number, 0 or more." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .insert({ sku: part.sku, name: part.name, retail_price: part.retail, low_stock_at: part.lowStockAt })
    .select("id")
    .single();
  if (error) return { error: friendly(error.message) };

  const { error: costError } = await supabase.from("part_costs").insert({ part_id: data.id, cost: part.cost });
  if (costError) return { error: "The part was added, but saving its cost failed. Edit it to try again." };

  if (starting > 0) {
    const { error: stockError } = await supabase
      .from("stock_movements")
      .insert({ part_id: data.id, change: starting, reason: "restock", note: "Starting stock" });
    if (stockError) return { error: "The part was added, but its starting stock wasn't. Use Restock." };
  }

  revalidatePath("/inventory");
  return { done: `${part.name} added.` };
}

// The owner edits a part's SKU, name, cost or low-stock level.
export async function editPart(partId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const part = readPart(formData);
  if ("error" in part) return { error: part.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .update({ sku: part.sku, name: part.name, retail_price: part.retail, low_stock_at: part.lowStockAt })
    .eq("id", partId)
    .select("id");
  if (error) return { error: friendly(error.message) };
  if (!data?.length) return { error: "Only the shop owner can do that." };

  const { error: costError } = await supabase.from("part_costs").upsert({ part_id: partId, cost: part.cost });
  if (costError) return { error: friendly(costError.message) };

  revalidatePath("/inventory");
  return { done: "Saved." };
}

// Restock (+) or adjustment (+ or −). Stock itself is only ever moved
// by these records; the database refuses anything else.
export async function recordMovement(
  partId: string,
  reason: "restock" | "adjustment",
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const amount = readNumber(text(formData, "amount"));
  const note = text(formData, "note");
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 9999) {
    return { error: "Enter a whole number (not 0)." };
  }
  if (reason === "restock" && amount < 0) return { error: "A restock adds stock: enter a positive number." };
  if (note.length > 200) return { error: "Keep the note under 200 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("stock_movements").insert({ part_id: partId, change: amount, reason, note });
  if (error) return { error: friendly(error.message) };

  revalidatePath("/inventory");
  revalidatePath("/workspace");
  return { done: reason === "restock" ? `Added ${amount}.` : `Adjusted by ${amount > 0 ? "+" : ""}${amount}.` };
}

// Archive (hide from pickers, keep history) or bring back a part.
export async function setPartActive(partId: string, active: boolean): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("parts").update({ active }).eq("id", partId).select("id");
  if (error || !data?.length) return { error: "Only the shop owner can do that." };
  revalidatePath("/inventory");
  return {};
}

export type ImportRow = {
  sku: string;
  name: string;
  cost: number;
  retail_price: number;
  quantity: number;
  low_stock_at: number;
};

export type ImportResult = { error?: string; created?: number; updated?: number };

/**
 * Imports parts from a file the owner has checked in the preview
 * (ticket 31). New SKUs become new parts, with their quantity recorded
 * as a restock; existing SKUs get their details updated, and a different
 * quantity is recorded as an adjustment, so the stock history still adds
 * up. Four database calls in all, however many rows.
 */
export async function importParts(rows: ImportRow[]): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) return { error: "There's nothing to import." };
  if (rows.length > 2000) return { error: "Import up to 2,000 parts at a time." };

  // Same checks as the preview, in case anything was changed on the way.
  const seen = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const sku = String(r.sku ?? "").trim();
    const ok =
      sku.length >= 1 && sku.length <= 40 &&
      String(r.name ?? "").trim().length >= 1 && String(r.name).trim().length <= 100 &&
      [r.cost, r.retail_price].every((n) => Number.isFinite(n) && n >= 0 && n <= 99_999_999.99) &&
      [r.quantity, r.low_stock_at].every((n) => Number.isInteger(n) && n >= 0 && n <= 9999);
    if (!ok) return { error: `Row ${i + 1} isn't valid. Check the file and try again.` };
    if (seen.has(sku.toLowerCase())) return { error: `SKU "${sku}" appears twice.` };
    seen.add(sku.toLowerCase());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };
  const shop = await getMyShop(supabase, user.id);
  if (shop?.role !== "owner") return { error: "Only the shop owner can import parts." };

  // What's there now, to tell new parts from updates and work out the
  // stock differences.
  const { data: existing } = await supabase.from("parts").select("id, sku, quantity");
  const before = new Map((existing ?? []).map((p) => [String(p.sku).toLowerCase(), p]));

  // 1. Parts: insert new SKUs, update existing ones (and un-archive).
  //    Quantity isn't sent: stock only moves through step 3.
  const { data: saved, error } = await supabase
    .from("parts")
    .upsert(
      rows.map((r) => ({
        shop_id: shop.id,
        // An existing part keeps its exact SKU spelling, so "LCD-1" in the
        // file updates "lcd-1" rather than creating a near-duplicate.
        sku: before.get(r.sku.trim().toLowerCase())?.sku ?? r.sku.trim(),
        name: r.name.trim(),
        retail_price: r.retail_price,
        low_stock_at: r.low_stock_at,
        active: true,
      })),
      { onConflict: "shop_id,sku" },
    )
    .select("id, sku");
  if (error || !saved) return { error: "Couldn't save the parts. Nothing was imported." };
  const idBySku = new Map(saved.map((p) => [String(p.sku).toLowerCase(), p.id as string]));

  // 2. Costs (owner-only table).
  const { error: costError } = await supabase
    .from("part_costs")
    .upsert(rows.map((r) => ({ part_id: idBySku.get(r.sku.trim().toLowerCase()), cost: r.cost })), { onConflict: "part_id" });
  if (costError) return { error: "The parts were saved, but their costs weren't. Import the same file again." };

  // 3. Stock: a restock for new parts, an adjustment for changed counts.
  const movements = rows.flatMap((r) => {
    const key = r.sku.trim().toLowerCase();
    const old = before.get(key);
    const partId = idBySku.get(key);
    if (!partId) return [];
    if (!old) return r.quantity > 0 ? [{ part_id: partId, change: r.quantity, reason: "restock", note: "Imported" }] : [];
    const diff = r.quantity - Number(old.quantity);
    return diff !== 0 ? [{ part_id: partId, change: diff, reason: "adjustment", note: `Imported count: ${r.quantity}` }] : [];
  });
  if (movements.length > 0) {
    const { error: stockError } = await supabase.from("stock_movements").insert(movements);
    if (stockError) return { error: "The parts were saved, but the stock counts weren't. Import the same file again." };
  }

  revalidatePath("/inventory");
  revalidatePath("/workspace");
  const created = rows.filter((r) => !before.has(r.sku.trim().toLowerCase())).length;
  return { created, updated: rows.length - created };
}
