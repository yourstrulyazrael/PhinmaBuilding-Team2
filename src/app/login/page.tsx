"use client";

import { useActionState, useState } from "react";
import { Wrench } from "lucide-react";
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
      <div className="flex items-center justify-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
          <Wrench className="size-5" aria-hidden />
        </span>
        <span className="text-xl font-semibold tracking-tight text-tertiary">Zenith Repair</span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isSignup ? "Create an account" : "Sign in"}</CardTitle>
          <CardDescription>
            For the technician only. Customers do not need an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />
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
                minLength={isSignup ? 6 : undefined}
                required
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          >
            {isSignup ? "I have an account" : "Create an account"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
