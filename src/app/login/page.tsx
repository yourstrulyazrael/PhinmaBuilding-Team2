"use client";

import { useActionState, useState } from "react";
import { Logo } from "@/components/logo";
import { authenticate, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  const isSignup = mode === "signup";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Logo size={40} className="justify-center" />
      <Card>
        <CardHeader>
          <CardTitle>{isSignup ? "Set up your store" : "Sign in"}</CardTitle>
          <CardDescription>
            {isSignup
              ? "Enter the store code you were given, then choose the email and password you will sign in with."
              : "For the shop owner and staff. Staff: use the email and password your owner gave you. Customers don't need an account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />
            {/* Accounts can only be made with a code from the developer
                (ticket 35); the database checks it. */}
            {isSignup && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="store_code">Store code</Label>
                <Input
                  id="store_code"
                  name="store_code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={20}
                  className="font-mono uppercase tracking-wider"
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
                required
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? "Please wait…" : isSignup ? "Set up my store" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          >
            {isSignup ? "I already have an account" : "Have a store code? Set up your store"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
