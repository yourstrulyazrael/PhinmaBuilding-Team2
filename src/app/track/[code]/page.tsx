import type { Metadata } from "next";
import { CalendarDays, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, formatDate, formatPeso, isFinished, isTrackingCode, type Status } from "@/lib/jobs";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";
import { CancelRequestForm, EstimateQuestion } from "./customer-actions";

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
  estimate_status: "pending" | "approved" | "declined" | null;
  notes: string;
  parts_replaced: string;
  promised_date: string;
  updated_at: string;
  cancel_requested: boolean;
  shop_name: string;
  shop_contact: string; // the owner's number
  technician_name: string; // who is handling the phone
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
      <Logo name={job?.shop_name ?? "Zenith Repair"} />

      {job ? <JobStatus job={job} code={code} /> : <NotFound />}
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

function JobStatus({ job, code }: { job: TrackedJob; code: string }) {
  // The six steps of a repair. Cancelled is shown separately, not as a step.
  const steps = STATUSES.filter((s) => s.value !== "cancelled");
  const current = steps.findIndex((s) => s.value === job.status);
  const cancelled = job.status === "cancelled";
  const finished = isFinished(job.status);
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
          <AutoRefresh code={code} />
        </div>

        {cancelled ? (
          <p className="border-t border-border pt-4 text-sm">
            This repair was cancelled. Contact the shop to arrange collecting your phone.
          </p>
        ) : (
        /* The six statuses, with only the current one marked. The
           technician can set statuses in any order, so earlier steps
           are not ticked: they may never have happened. */
        <ol className="flex flex-col gap-2 border-t border-border pt-4">
          {steps.map((s, i) => {
            const now = i === current;
            return (
              <li key={s.value} className="flex items-center gap-3 text-sm" aria-current={now ? "step" : undefined}>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    now ? "border-primary text-primary ring-4 ring-muted" : "border-border",
                  )}
                >
                  {now && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className={cn(now ? "font-semibold text-tertiary" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
        )}
      </Card>

      {job.estimate_status === "pending" && job.revised_estimate !== null && !finished && (
        <EstimateQuestion code={code} initial={job.initial_quote} revised={job.revised_estimate} />
      )}

      <Card className="p-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Initial quote</dt>
          <dd className="font-medium tabular-nums">{formatPeso(job.initial_quote)}</dd>
          {job.revised_estimate !== null && (
            <>
              <dt className="text-muted-foreground">Revised estimate</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">{formatPeso(job.revised_estimate)}</span>
                {job.estimate_status === "approved" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-primary">You approved</span>
                )}
                {job.estimate_status === "declined" && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                    You declined: the shop will contact you
                  </span>
                )}
              </dd>
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
          <p className="text-xs text-muted-foreground">Your repair shop</p>
          <p className="truncate text-sm font-medium text-tertiary">{job.shop_name}</p>
        </div>
        <a
          href={`tel:${job.shop_contact.replace(/[^\d+]/g, "")}`}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Phone className="size-4" aria-hidden />
          {job.shop_contact}
        </a>
      </Card>

      {!finished && (job.cancel_requested ? (
        <p className="text-center text-sm text-muted-foreground">
          You asked to cancel this repair. The shop will contact you.
        </p>
      ) : (
        <CancelRequestForm code={code} />
      ))}
    </>
  );
}
