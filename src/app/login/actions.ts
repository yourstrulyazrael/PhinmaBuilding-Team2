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
    if (password.length < 6) {
      return { error: "Use a password of at least 6 characters." };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // With "Confirm email" turned off, Supabase signs the new account in
    // straight away. No session means that setting is still on.
    if (!data.session) {
      return {
        error:
          "Account created, but Supabase is waiting for email confirmation. " +
          "Turn off \"Confirm email\" in Supabase (Authentication → Sign In / Providers → Email).",
      };
    }
    // New accounts fill in My details first: the claim slip needs them.
    redirect("/details");
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
