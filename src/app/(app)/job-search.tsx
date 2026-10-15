"use client";

import Form from "next/form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Search, X } from "lucide-react";
import { SORTS, type Sort } from "@/lib/jobs";
import { Input } from "@/components/ui/input";

/**
 * Search box and sort menu for the Jobs list. The search runs as you
 * type, from the first letter: a moment after you stop typing, ?q=… is
 * put in the page address and the server filters the list. Back and
 * refresh keep the search. The sort menu applies straight away too.
 */
const TYPING_PAUSE_MS = 250;

export function JobSearch({
  q,
  sort,
  tab,
}: {
  q: string;
  sort: Sort;
  tab: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  // If the address changes some other way (Back, a tab, the empty-state
  // "Clear" link), show that search in the box.
  const [shownQ, setShownQ] = useState(q);
  if (q !== shownQ) {
    setShownQ(q);
    if (q !== value.trim()) setValue(q);
  }

  // A short pause after the last key, then search. Replacing (not
  // pushing) the address keeps Back from stepping through every letter.
  useEffect(() => {
    const next = value.trim();
    if (next === q) return;
    const timer = window.setTimeout(() => router.replace(href(tab, sort, next), { scroll: false }), TYPING_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [value, q, tab, sort, router]);

  return (
    <Form action="/" className="flex flex-col gap-2 px-4 pt-4 sm:flex-row md:px-6" role="search">
      {tab !== "mine" && <input type="hidden" name="tab" value={tab} />}

      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search device, problem, customer or contact no."
          aria-label="Search repair jobs"
          maxLength={100}
          autoComplete="off"
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden />
          </button>
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
          className="h-10 w-full appearance-none rounded-[var(--radius)] border border-input bg-card pl-9 pr-3 text-base shadow-xs transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 md:text-sm"
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

// The Jobs list address for a tab, sort and search; defaults are left out.
function href(tab: string, sort: Sort, q: string) {
  const params = new URLSearchParams();
  if (tab !== "mine") params.set("tab", tab);
  if (sort !== SORTS[0].value) params.set("sort", sort);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
