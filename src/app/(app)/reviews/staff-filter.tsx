"use client";

import Form from "next/form";
import { UserRound } from "lucide-react";

/**
 * The owner's "whose reviews" dropdown on the Reviews page (ticket 63).
 * Picking someone applies straight away and keeps the other filters.
 */
export function StaffFilter({
  staff,
  options,
  keep,
}: {
  staff: string;
  options: { id: string; name: string }[];
  keep: Record<string, string>;
}) {
  return (
    <Form action="/reviews" scroll={false}>
      {Object.entries(keep).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className="relative flex items-center">
        <span className="sr-only">Whose reviews</span>
        <UserRound className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
        <select
          name="staff"
          defaultValue={staff}
          key={staff}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-9 appearance-none rounded-[var(--radius)] border border-input bg-card pl-9 pr-8 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
        >
          <option value="">Everyone</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </Form>
  );
}
