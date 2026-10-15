"use client";

import Form from "next/form";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { PRESETS, isMonthKey } from "@/lib/periods";
import { cn } from "@/lib/utils";

/**
 * Today · 7 days · 30 days, and on Reports a month too (ticket 26). One
 * row above everything it controls; the choice lives in the address
 * (?period=…), so refresh and Back keep it. Hidden when printing.
 */
export function PeriodPicker({ path, current, allowMonth = false }: { path: string; current: string; allowMonth?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <nav aria-label="Period" className="inline-flex rounded-[var(--radius)] border border-border bg-card p-1">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`${path}?period=${p.key}`}
            aria-current={current === p.key ? "page" : undefined}
            className={cn(
              "rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-sm font-medium transition-colors",
              current === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {allowMonth && (
        // Picking a month reloads the page with ?period=YYYY-MM.
        <Form action={path} className="flex items-center gap-2">
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
