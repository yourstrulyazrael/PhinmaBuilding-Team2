"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { StatusPicker } from "@/components/status-picker";
import { CopyButton, useCopy } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import type { Status } from "@/lib/jobs";
import { cn } from "@/lib/utils";

/**
 * The repair page's action bar (ticket 70): once the Status card scrolls
 * out of view, a bar slides up at the bottom with the repair number,
 * Update status, Record payment and Copy tracking link, so they are
 * always one tap away. It slides away again when the Status card is back
 * on screen. Toasts move up so they don't cover it.
 */
export function ActionBar({
  watch,
  jobId,
  number,
  status,
  price,
  device,
  trackingUrl,
}: {
  watch: string; // the id of the element that, while visible, hides the bar
  jobId: string;
  number: string;
  status: Status;
  price: number;
  device: string;
  trackingUrl: string;
}) {
  const [show, setShow] = useState(false);
  const copy = useCopy();

  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Only once it has scrolled up past the top, not before reaching it.
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  useEffect(() => {
    const root = document.documentElement;
    if (show) root.style.setProperty("--toast-offset", "5.5rem");
    else root.style.removeProperty("--toast-offset");
    return () => {
      root.style.removeProperty("--toast-offset");
    };
  }, [show]);

  return (
    <div
      role="region"
      aria-label="Repair actions"
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] print:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
        <span className="mr-auto flex min-w-0 items-center gap-1">
          <span className="truncate text-sm">
            <span className="font-mono text-xs text-muted-foreground">{number}</span>
            <span className="ml-2 hidden font-medium sm:inline">{device}</span>
          </span>
          <CopyButton text={number} what="Repair number" />
        </span>
        <StatusPicker jobId={jobId} status={status} variant="select" price={price} device={device} withPayment />
        <Button type="button" variant="secondary" size="sm" onClick={() => copy(trackingUrl, "Tracking link")}>
          <Link2 className="size-4" aria-hidden />
          <span className="hidden sm:inline">Copy tracking link</span>
          <span className="sm:hidden">Link</span>
        </Button>
      </div>
    </div>
  );
}
