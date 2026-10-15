import Link from "next/link";
import { Phone, UsersRound } from "lucide-react";
import { formatDate, type Job } from "@/lib/jobs";
import { groupCustomers, manilaDate } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

// Customers, built from the jobs: one entry per phone number. Only the
// technician sees this page, so names and phones are shown here.
export function CustomersTab({ jobs }: { jobs: Job[] }) {
  const customers = groupCustomers(jobs);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-tertiary">
          <UsersRound className="size-4" aria-hidden />
          Customers
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {customers.length}
          </span>
        </CardTitle>
        <CardDescription>Everyone who has brought you a repair, most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No customers yet. They appear here when you add a repair.
          </p>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {customers.map((c) => (
              <li key={c.key} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium text-tertiary">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.jobs.length} repair{c.jobs.length === 1 ? "" : "s"}
                    {c.openCount > 0 && ` · ${c.openCount} open`}
                    {" · last visit "}
                    {formatDate(manilaDate(c.lastVisit))}
                  </p>
                </div>
                {/* Plain text, not a "tel:" link, so a click doesn't open a
                    "call with…?" prompt. Select to copy. */}
                <span className="inline-flex w-fit items-center gap-1.5 text-sm">
                  <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="select-all">{c.phone}</span>
                </span>
                <ul className="flex flex-col gap-1.5">
                  {c.jobs.map((job) => (
                    <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <Link href={`/jobs/${job.id}`} className="underline-offset-4 hover:underline">
                        {job.device}
                        <span className="text-muted-foreground"> · {job.problem}</span>
                      </Link>
                      <StatusBadge status={job.status} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
