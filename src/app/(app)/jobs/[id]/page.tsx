import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Phone, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, isFinished, paymentLabel, type Job } from "@/lib/jobs";
import { currentPrice } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { CopyMessageButton } from "@/components/copy-message-button";
import { trackingUrl } from "@/lib/tracking-url";
import { updateMessage } from "@/lib/update-message";
import { JobDetailsForm } from "./job-details-form";
import { CancelRequest } from "./cancel-request";

// The technician's view of one repair job. Unlike the claim slip and
// tracking page, this screen shows the customer's name and phone.
export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: another technician's job id returns nothing -> "not found".
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>();
  if (!job) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit" })}>
        <ArrowLeft className="mr-1.5 size-4" aria-hidden />
        Repair jobs
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-tertiary">{job.device}</h1>
          <p className="text-sm text-muted-foreground">{job.problem}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <CopyMessageButton message={updateMessage(job, await trackingUrl(job.tracking_code))} />
          <Link href={`/jobs/${job.id}/slip`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <QrCode className="mr-1.5 size-4" aria-hidden />
            Claim slip
          </Link>
          <Link
            href={`/track/${job.tracking_code}`}
            target="_blank"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink className="mr-1.5 size-4" aria-hidden />
            Customer view
          </Link>
        </div>
      </header>

      {job.cancel_requested_at && !isFinished(job.status) && (
        <CancelRequest jobId={job.id} reason={job.cancel_reason} requestedOn={formatDateTime(job.cancel_requested_at)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-tertiary">Status</CardTitle>
          <CardDescription>Tap to change. The customer&apos;s page updates straight away.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusPicker jobId={job.id} status={job.status} variant="buttons" price={currentPrice(job)} device={job.device} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{job.customer_name}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>
              <a href={`tel:${job.customer_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
                <Phone className="size-3.5" aria-hidden />
                {job.customer_phone}
              </a>
            </dd>
            <dt className="text-muted-foreground">Initial quote</dt>
            <dd className="font-medium tabular-nums">{formatPeso(job.initial_quote)}</dd>
            {job.revised_estimate !== null && (
              <>
                <dt className="text-muted-foreground">Revised estimate</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tabular-nums">{formatPeso(job.revised_estimate)}</span>
                  <EstimateAnswer job={job} />
                </dd>
              </>
            )}
            {job.amount_paid !== null && (
              <>
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-medium">
                  {formatPeso(job.amount_paid)} by {paymentLabel(job.payment_method)}
                  {job.paid_at && <span className="font-normal text-muted-foreground"> on {formatDateTime(job.paid_at)}</span>}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Promised by</dt>
            <dd>{formatDate(job.promised_date)}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Customer name and phone are private: never on the claim slip or tracking page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-tertiary">Update for the customer</CardTitle>
          <CardDescription>Shown on the customer&apos;s tracking page.</CardDescription>
        </CardHeader>
        <CardContent>
          <JobDetailsForm job={job} />
        </CardContent>
      </Card>
    </main>
  );
}

// The customer's answer to the revised estimate (ticket 17).
function EstimateAnswer({ job }: { job: Job }) {
  if (job.estimate_status === null) return null;
  const styles = {
    pending: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    approved: "bg-muted text-primary",
    declined: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  const labels = {
    pending: "Waiting for the customer",
    approved: "Customer approved",
    declined: "Customer declined",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[job.estimate_status]}`}>
      {labels[job.estimate_status]}
    </span>
  );
}

// "Oct 15, 3:42 PM", in Manila time.
function formatDateTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
