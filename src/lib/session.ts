import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { loadNames } from "@/lib/people";
import { todayInManila, type Job } from "@/lib/jobs";
import { lowStock, type Part } from "@/lib/inventory";
import { attentionAlerts, type Alert } from "@/lib/workspace";

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
 * for the owner, staff requests to revise estimates and revised
 * estimates staff proposed on a repair (ticket 39). Fetched once per
 * page load and shared by the bell and the page. RLS: this shop only.
 */
export const getNotifications = cache(async () => {
  const supabase = await getSupabase();
  const shop = await getShop();
  if (!shop) return { alerts: [], lowStock: [], requests: 0, proposals: [], keys: [] as string[] };

  const owner = shop.role === "owner";
  const [{ data: jobRows }, { data: partRows }, { data: requestRows }, { data: proposalRows }] = await Promise.all([
    supabase.from("jobs").select("*").not("status", "in", "(picked_up,cancelled)"),
    supabase.from("parts").select("*"),
    owner
      ? supabase.from("estimate_requests").select("id").eq("status", "pending")
      : Promise.resolve({ data: [] }),
    // Owner: revised estimates staff proposed on a repair (ticket 39).
    owner
      ? supabase.from("estimate_proposals").select("id, job_id, staff_id, amount").eq("status", "pending")
      : Promise.resolve({ data: [] }),
  ]);
  // Some reminders (a customer approving a revised estimate, ticket 40)
  // are only for the owner and the person handling that repair.
  const user = await getUser();
  const alerts = attentionAlerts((jobRows ?? []) as Job[], todayInManila(), user ? { id: user.id, isOwner: owner } : undefined);
  const low = lowStock((partRows ?? []) as Part[]);
  const requestIds = (requestRows ?? []).map((r) => r.id as string);
  // Only proposals on repairs that are still open need an answer.
  const openJobs = new Map(((jobRows ?? []) as Job[]).map((j) => [j.id, j]));
  const proposals = (proposalRows ?? []).flatMap((p) => {
    const job = openJobs.get(p.job_id as string);
    return job ? [{ id: p.id as string, job, staffId: p.staff_id as string, amount: Number(p.amount) }] : [];
  });

  // A stable name for each notification (ticket 41), so the bell can
  // remember which ones you have already seen and spot new arrivals.
  // Where the same reminder can come back for a new reason (another
  // cancel request, another answer, another estimate), the name includes
  // that, so it counts as new. Low-stock names start "low:": the bell
  // counts them as one.
  const keys = [
    ...alerts.map(({ job, kind }) => `${kind}:${job.id}:${alertStamp(job, kind)}`),
    ...low.map((p) => `low:${p.id}`),
    ...requestIds.map((id) => `request:${id}`),
    ...proposals.map((p) => `proposal:${p.id}`),
  ];

  return { alerts, lowStock: low, requests: requestIds.length, proposals, keys };
});

function alertStamp(job: Job, kind: Alert["kind"]) {
  if (kind === "cancel") return job.cancel_requested_at ?? "";
  if (kind === "approved" || kind === "declined") return job.estimate_answered_at ?? "";
  if (kind === "estimate") return String(job.revised_estimate ?? "");
  return "";
}
