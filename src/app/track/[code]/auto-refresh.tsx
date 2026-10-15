"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const EVERY_MS = 15_000;

/**
 * Re-checks the repair status every 15 seconds while the page is open,
 * so the customer never has to tap refresh.
 *
 * router.refresh() asks the server to re-render this page with fresh
 * data. It keeps the scroll position and does not reload the browser.
 * It pauses while the tab is hidden or the phone screen is off, and
 * checks straight away when the customer comes back.
 */
export function AutoRefresh() {
  const router = useRouter();

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
      <RefreshCw className="size-3" aria-hidden />
      Updates automatically
    </p>
  );
}
