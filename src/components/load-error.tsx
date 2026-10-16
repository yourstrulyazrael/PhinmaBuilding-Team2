"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCw, WifiOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Shown instead of a page that failed to load (ticket 67), usually a
 * dropped connection or Supabase being briefly unreachable. "Try again"
 * loads the page afresh without a full reload; the error itself goes to
 * the browser console for whoever is debugging.
 */
export function LoadError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-tertiary">
        <WifiOff className="size-5" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold text-tertiary">This page didn&apos;t load</h1>
      <p className="text-sm text-muted-foreground">
        Usually the connection dropped for a moment. Your saved repairs are safe.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          <RotateCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
          {pending ? "Trying…" : "Try again"}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          Go to Overview
        </Link>
      </div>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Code: {error.digest}</p>}
    </main>
  );
}
