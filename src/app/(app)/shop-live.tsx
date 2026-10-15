"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type CustomerEvent = {
  event: "estimate_approved" | "estimate_declined" | "cancel_requested";
  job_id: string;
  device: string;
  handled_by: string;
};

type Notice = CustomerEvent & { key: number };

const SHOW_MS = 12_000;

const LOOK = {
  estimate_approved: {
    icon: ThumbsUp,
    title: "Customer approved the revised quote",
    tone: "border-emerald-300 dark:border-emerald-800",
    iconTone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  estimate_declined: {
    icon: ThumbsDown,
    title: "Customer declined the revised quote",
    tone: "border-red-300 dark:border-red-900",
    iconTone: "bg-red-50 text-destructive dark:bg-red-950",
  },
  cancel_requested: {
    icon: Ban,
    title: "Customer asked to cancel",
    tone: "border-red-300 dark:border-red-900",
    iconTone: "bg-red-50 text-destructive dark:bg-red-950",
  },
} as const;

/**
 * Customer answers, live (ticket 52). Listens on the shop's private
 * Realtime channel (supabase/sql/025); when a customer approves or
 * declines a revised quote or asks to cancel:
 *   - every open page refreshes its data straight away (the repair page,
 *     the list, the bell), no reload needed
 *   - the owner and whoever handles that repair also get a pop-up in the
 *     corner, with a link to the repair; it fades after 12 seconds
 */
export function ShopLive({ shopId, userId, isOwner }: { shopId: string; userId: string; isOwner: boolean }) {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopped = false;

    // The channel is private: join with the signed-in person's login
    // (setAuth loads it), or the shop-members-only rule turns us away.
    supabase.realtime.setAuth().then(() => {
      if (stopped) return;
      channel = supabase
        .channel(`shop:${shopId}`, { config: { private: true } })
        .on("broadcast", { event: "customer" }, ({ payload }) => {
          const e = payload as CustomerEvent;
          router.refresh();
          if (!(e.event in LOOK) || !(isOwner || e.handled_by === userId)) return;
          const key = Date.now() + Math.random();
          setNotices((n) => [...n.slice(-2), { ...e, key }]);
          window.setTimeout(() => setNotices((n) => n.filter((x) => x.key !== key)), SHOW_MS);
        })
        .subscribe();
    });

    return () => {
      stopped = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [shopId, userId, isOwner, router]);

  if (notices.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96 print:hidden"
    >
      {notices.map((n) => {
        const look = LOOK[n.event];
        const Icon = look.icon;
        return (
          <div
            key={n.key}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full animate-menu-in items-start gap-3 rounded-[var(--radius)] border bg-card p-3 text-sm shadow-xl",
              look.tone,
            )}
          >
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", look.iconTone)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="font-medium text-tertiary">{look.title}</p>
              <p className="truncate text-muted-foreground">{n.device}</p>
              <Link href={`/jobs/${n.job_id}`} className="w-fit font-medium text-primary underline-offset-4 hover:underline">
                Open the repair
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setNotices((all) => all.filter((x) => x.key !== n.key))}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
