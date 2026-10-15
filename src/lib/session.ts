import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getMyShop } from "@/lib/shop";
import { loadNames } from "@/lib/people";

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
