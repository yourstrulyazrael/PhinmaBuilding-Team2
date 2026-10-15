import { createClient } from "@supabase/supabase-js";

/**
 * A short-lived Supabase client for SERVER code that must act as a
 * DIFFERENT person from whoever is signed in: used only when the owner
 * creates a staff account (ticket 22). It signs the new account up and
 * saves its details with that account's own session.
 *
 * It never touches the cookies, so the owner stays signed in as
 * themselves, and it remembers nothing after the request.
 *
 * Still the anon key: this is the same sign-up anyone can do on the
 * login page, so RLS applies exactly as usual. No service_role key.
 */
export function createTemporaryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase env vars missing.");

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
