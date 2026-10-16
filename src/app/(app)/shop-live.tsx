"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Ban, ThumbsDown, ThumbsUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast, type ToastKind } from "@/components/toast";

type CustomerEvent = {
  event: "estimate_approved" | "estimate_declined" | "cancel_requested";
  job_id: string;
  device: string;
  handled_by: string;
};

const SHOW_MS = 12_000;

const LOOK = {
  estimate_approved: { icon: ThumbsUp, title: "Customer approved the revised quote", kind: "success" },
  estimate_declined: { icon: ThumbsDown, title: "Customer declined the revised quote", kind: "error" },
  cancel_requested: { icon: Ban, title: "Customer asked to cancel", kind: "error" },
} as const satisfies Record<string, { icon: unknown; title: string; kind: ToastKind }>;

/**
 * Customer answers, live (ticket 52). Listens on the shop's private
 * Realtime channel (supabase/sql/025); when a customer approves or
 * declines a revised quote or asks to cancel:
 *   - every open page refreshes its data straight away (the repair page,
 *     the list, the bell), no reload needed
 *   - the owner and whoever handles that repair also get a toast in the
 *     corner (ticket 67), with a link to the repair; it fades after 12
 *     seconds
 */
export function ShopLive({ shopId, userId, isOwner }: { shopId: string; userId: string; isOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();

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
          const look = LOOK[e.event];
          toast({
            kind: look.kind,
            icon: look.icon,
            title: look.title,
            description: e.device,
            link: { href: `/jobs/${e.job_id}`, label: "Open the repair" },
            duration: SHOW_MS,
          });
        })
        .subscribe();
    });

    return () => {
      stopped = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [shopId, userId, isOwner, router, toast]);

  return null;
}
