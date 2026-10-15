"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

/**
 * Handles both "Sign in" and "Create an account" from the login form.
 * The form sends a hidden "mode" field so we know which one was meant.
 */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    // Nobody can sign up without a store code from the developer
    // (ticket 35). The real check is in the database
    // (supabase/sql/017-store-codes.sql); this only catches typos early.
    const storeCode = String(formData.get("store_code") ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (storeCode.length !== 12) {
      return { error: "Enter the 12-character store code you were given, e.g. 1A2B-3C4D-5E6F." };
    }
    if (password.length < 8) {
      return { error: "Use a password of at least 8 characters." };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { store_code: storeCode } },
    });
    if (error) {
      // When the database refuses the code, Supabase only says "Database
      // error saving new user", so we say what it means.
      if (/database error/i.test(error.message)) {
        return { error: "That store code is not valid or has already been used." };
      }
      return { error: error.message };
    }
    // Supabase hides whether an email is taken: a taken email comes back
    // with no identities.
    if (data.user?.identities?.length === 0) {
      return { error: "That email already has an account. Sign in instead." };
    }
    // With "Confirm email" turned off, Supabase signs the new account in
    // straight away. No session means that setting is still on.
    if (!data.session) {
      return {
        error:
          "Account created, but Supabase is waiting for email confirmation. " +
          "Turn off \"Confirm email\" in Supabase (Authentication → Sign In / Providers → Email).",
      };
    }
    // New accounts set up their shop first: every job belongs to one.
    redirect("/setup");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
