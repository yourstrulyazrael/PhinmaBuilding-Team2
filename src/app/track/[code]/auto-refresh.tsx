"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EVERY_MS = 15_000;

/**
 * Keeps the tracking page up to date without the customer tapping
 * refresh, in two ways:
 *
 * 1. Live: listens on the private Realtime channel "track:<code>". The
 *    database sends an empty "changed" message there whenever this job
 *    changes (supabase/sql/005-instant-tracking-updates.sql). The
 *    message holds no data; it just says "check again".
 * 2. Backup: re-checks every 15 seconds, in case the live connection
 *    drops on a weak signal.
 *
 * router.refresh() asks the server to re-render this page with fresh
 * data. It keeps the scroll position and does not reload the browser.
 * The 15-second check pauses while the tab is hidden or the phone
 * screen is off, and checks straight away when the customer comes back.
 */
export function AutoRefresh({ code }: { code: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`track:${code}`, { config: { private: true } })
      .on("broadcast", { event: "changed" }, () => router.refresh())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refreshIfVisible, EVERY_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {live ? (
        <Zap className="size-3 text-primary" aria-hidden />
      ) : (
        <RefreshCw className="size-3" aria-hidden />
      )}
      {live ? "Live: updates instantly" : "Updates automatically"}
    </p>
  );
}
