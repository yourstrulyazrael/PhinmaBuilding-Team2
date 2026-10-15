"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const lowStockAt = readNumber(text(formData, "low_stock_at"));
  if (!sku || sku.length > 40) return { error: "Enter a SKU (up to 40 characters)." };
  if (!name || name.length > 100) return { error: "Enter the part name (up to 100 characters)." };
  if (!Number.isFinite(cost) || cost < 0 || cost > 99_999_999.99) return { error: "Enter a cost of ₱0 or more." };
  if (!Number.isInteger(lowStockAt) || lowStockAt < 0 || lowStockAt > 9999) {
    return { error: "Enter a low-stock level: a whole number, 0 or more." };
  }
  return { sku, name, cost, lowStockAt };
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
    .insert({ sku: part.sku, name: part.name, low_stock_at: part.lowStockAt })
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
    .update({ sku: part.sku, name: part.name, low_stock_at: part.lowStockAt })
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
