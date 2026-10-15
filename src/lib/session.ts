import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { loadNames } from "@/lib/people";
import { todayInManila, type Job } from "@/lib/jobs";
import { lowStock, type Part } from "@/lib/inventory";
import { attentionAlerts } from "@/lib/workspace";

/**
 * The signed-in person, their shop and their shopmates' names, fetched
 * at most ONCE per page load and shared by the layout and the page.
 *
 * React's cache() remembers the answer for the length of one request,
 * so the layout and the page asking the same question cost one trip to
 * the database, not two. (Each new click is a new request, so nothing
 * goes stale.) Security is unchanged: it's the same calls, made once.
 */
export const getSupabase = cache(createClient);

export const getUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getShop = cache(async () => {
  const user = await getUser();
  return user ? getMyShop(await getSupabase(), user.id) : null;
});

export const getNames = cache(async () => loadNames(await getSupabase()));

// The signed-in person's own name and contact number.
export const getMe = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const { data } = await (await getSupabase())
    .from("technicians")
    .select("display_name, contact_number")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

/**
 * What the bell in the top bar counts, and the Notifications page lists
 * (ticket 38): reminders worked out from the OPEN repairs only (finished
 * ones never need attention, so this stays small), low-stock parts, and
 * for the owner, staff requests to revise estimates. Fetched once per
 * page load and shared by the bell and the page. RLS: this shop only.
 */
export const getNotifications = cache(async () => {
  const supabase = await getSupabase();
  const shop = await getShop();
  if (!shop) return { alerts: [], lowStock: [], requests: 0, count: 0 };

  const [{ data: jobRows }, { data: partRows }, { count: requests }] = await Promise.all([
    supabase.from("jobs").select("*").not("status", "in", "(picked_up,cancelled)"),
    supabase.from("parts").select("*"),
    shop.role === "owner"
      ? supabase.from("estimate_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  const alerts = attentionAlerts((jobRows ?? []) as Job[], todayInManila());
  const low = lowStock((partRows ?? []) as Part[]);
  const waiting = requests ?? 0;
  return {
    alerts,
    lowStock: low,
    requests: waiting,
    // Low stock counts once, however many parts are low.
    count: alerts.length + (low.length > 0 ? 1 : 0) + waiting,
  };
});
