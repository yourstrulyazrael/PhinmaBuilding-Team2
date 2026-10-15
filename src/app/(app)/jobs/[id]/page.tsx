import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Phone, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, type Job } from "@/lib/jobs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { JobDetailsForm } from "./job-details-form";

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
        <div className="flex flex-wrap gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-tertiary">Status</CardTitle>
          <CardDescription>Tap to change. The customer sees it on their next refresh.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusPicker jobId={job.id} status={job.status} variant="buttons" />
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
