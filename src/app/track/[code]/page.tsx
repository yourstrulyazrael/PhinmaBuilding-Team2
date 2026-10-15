import type { Metadata } from "next";
import { CalendarDays, Check, Phone, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, formatDate, formatPeso, isTrackingCode, type Status } from "@/lib/jobs";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = {
  title: "Repair status · Zenith Repair",
  // Tracking pages are private to whoever holds the link: keep them out
  // of search engines.
  robots: { index: false, follow: false },
};

// Exactly what get_tracking_page returns. Note what is NOT here: the
// customer's name and phone number.
type TrackedJob = {
  device: string;
  problem: string;
  status: Status;
  initial_quote: number;
  revised_estimate: number | null;
  notes: string;
  parts_replaced: string;
  promised_date: string;
  updated_at: string;
  technician_name: string;
  technician_contact: string;
};

/**
 * The public page a customer opens by scanning their claim slip. No
 * login. It can only see what the get_tracking_page database function
 * hands back for this one tracking code.
 */
export default async function TrackingPage({ params }: PageProps<"/track/[code]">) {
  const { code } = await params;

  let job: TrackedJob | null = null;
  if (isTrackingCode(code)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_tracking_page", { code });
    job = (data?.[0] as TrackedJob | undefined) ?? null;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
          <Wrench className="size-4" aria-hidden />
        </span>
        <span className="text-lg font-semibold tracking-tight text-tertiary">
          {job?.technician_name ?? "Zenith Repair"}
        </span>
      </div>

      {job ? <JobStatus job={job} /> : <NotFound />}
    </main>
  );
}

function NotFound() {
  return (
    <Card className="flex flex-col gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold text-tertiary">No repair found</h1>
      <p className="text-sm text-muted-foreground">
        Check that you scanned the QR code on your claim slip, or ask your
        technician for the link again.
      </p>
    </Card>
  );
}

function JobStatus({ job }: { job: TrackedJob }) {
  const current = STATUSES.findIndex((s) => s.value === job.status);
  const updated = new Date(job.updated_at).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your repair
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-tertiary">{job.device}</h1>
          <p className="text-sm text-muted-foreground">{job.problem}</p>
        </div>
        <div className="flex flex-col gap-1">
          <StatusBadge status={job.status} className="px-3 py-1 text-sm" />
          <p className="text-xs text-muted-foreground">Last updated {updated}</p>
          <AutoRefresh />
        </div>

        {/* Progress through the six statuses */}
        <ol className="flex flex-col gap-2 border-t border-border pt-4">
          {STATUSES.map((s, i) => {
            const done = i < current;
            const now = i === current;
            return (
              <li key={s.value} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    done && "border-primary bg-primary text-primary-foreground",
                    now && "border-primary text-primary ring-4 ring-muted",
                    !done && !now && "border-border",
                  )}
                >
                  {done && <Check className="size-3" aria-hidden />}
                  {now && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className={cn(now ? "font-semibold text-tertiary" : done ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card className="p-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Initial quote</dt>
          <dd className="font-medium tabular-nums">{formatPeso(job.initial_quote)}</dd>
          {job.revised_estimate !== null && (
            <>
              <dt className="text-muted-foreground">Revised estimate</dt>
              <dd className="font-medium tabular-nums">{formatPeso(job.revised_estimate)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Promised by</dt>
          <dd className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
            {formatDate(job.promised_date)}
          </dd>
          {job.notes && (
            <>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-line">{job.notes}</dd>
            </>
          )}
          {job.parts_replaced && (
            <>
              <dt className="text-muted-foreground">Parts replaced</dt>
              <dd className="whitespace-pre-line">{job.parts_replaced}</dd>
            </>
          )}
        </dl>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Your technician</p>
          <p className="truncate text-sm font-medium text-tertiary">{job.technician_name}</p>
        </div>
        <a
          href={`tel:${job.technician_contact.replace(/[^\d+]/g, "")}`}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Phone className="size-4" aria-hidden />
          {job.technician_contact}
        </a>
      </Card>
    </>
  );
}
