"use client";

import Form from "next/form";
import Link from "next/link";
import { ArrowUpDown, Search, X } from "lucide-react";
import { SORTS, type Sort } from "@/lib/jobs";
import { Input } from "@/components/ui/input";

/**
 * Search box and sort menu for the Jobs list. It is a plain form that
 * puts ?q=…&sort=… in the page address, so Back and refresh keep the
 * search. The server does the actual filtering.
 */
export function JobSearch({
  q,
  sort,
  tab,
  clearHref,
}: {
  q: string;
  sort: Sort;
  tab: string;
  clearHref: string;
}) {
  return (
    <Form action="/" className="flex flex-col gap-2 px-4 pt-4 sm:flex-row md:px-6" role="search">
      {tab !== "all" && <input type="hidden" name="tab" value={tab} />}

      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          defaultValue={q}
          // A new key when q changes resets the box, e.g. after "Clear".
          key={q}
          placeholder="Search device, problem, customer or phone"
          aria-label="Search repair jobs"
          maxLength={100}
          className="pl-9 pr-9"
        />
        {q && (
          <Link
            href={clearHref}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      <label className="relative flex items-center sm:w-48">
        <span className="sr-only">Sort by</span>
        <ArrowUpDown
          className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          aria-hidden
        />
        {/* Picking a sort submits the form straight away: no extra tap. */}
        <select
          name="sort"
          defaultValue={sort}
          key={sort}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-10 w-full appearance-none rounded-[var(--radius)] border border-input bg-background pl-9 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {/* Enter (the keyboard's Search key on a phone) submits. This
          hidden button gives screen-reader users a button to press. */}
      <button type="submit" className="sr-only">
        Search
      </button>
    </Form>
  );
}
