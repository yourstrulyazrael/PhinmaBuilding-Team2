"use client";

import Form from "next/form";
import { SlidingTabs } from "./sliding-tabs";
import { CalendarRange } from "lucide-react";
import { PRESETS, isMonthKey } from "@/lib/periods";
import { cn } from "@/lib/utils";

/**
 * Today · 7 days · 30 days, and on Reports a month too (ticket 26). One
 * row above everything it controls; the choice lives in the address
 * (?period=…), so refresh and Back keep it. Hidden when printing.
 */
export function PeriodPicker({
  path,
  current,
  allowMonth = false,
  keep = {},
}: {
  path: string;
  current: string;
  allowMonth?: boolean;
  keep?: Record<string, string>; // other filters in the address to keep (e.g. on Reviews)
}) {
  const href = (period: string) => `${path}?${new URLSearchParams({ ...keep, period })}`;
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* The green pill glides to the picked period (ticket 53). */}
      <SlidingTabs
        label="Period"
        items={PRESETS.map((p) => ({ key: p.key, href: href(p.key), label: p.label }))}
        active={PRESETS.some((p) => p.key === current) ? current : null}
      />

      {allowMonth && (
        // Picking a month reloads the page with ?period=YYYY-MM.
        <Form action={path} scroll={false} className="flex items-center gap-2">
          {Object.entries(keep).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="size-4" aria-hidden />
            <span className="sr-only">A whole month</span>
            <input
              type="month"
              name="period"
              defaultValue={isMonthKey(current) ? current : ""}
              key={current}
              onChange={(e) => e.currentTarget.value && e.currentTarget.form?.requestSubmit()}
              aria-label="A whole month"
              className={cn(
                "h-9 rounded-[var(--radius)] border bg-card px-2 text-sm text-foreground",
                isMonthKey(current) ? "border-primary ring-1 ring-primary" : "border-input",
              )}
            />
          </label>
        </Form>
      )}
    </div>
  );
}
