import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlarmClock, ArrowLeft, ExternalLink, Lock, Package, Phone, QrCode, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatPeso, isFinished, paymentLabel, todayInManila, type Job } from "@/lib/jobs";
import { currentPrice, isLate } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { CopyMessageButton } from "@/components/copy-message-button";
import { trackingUrl } from "@/lib/tracking-url";
import { delayMessage, updateMessage } from "@/lib/update-message";
import { JobDetailsForm } from "./job-details-form";
import { canChange, nameOf, type Viewer } from "@/lib/people";
import { HandledBy } from "@/components/handled-by";
import { StatusBadge } from "@/components/status-badge";
import { CancelRequest } from "./cancel-request";
import { PartsUsed } from "./parts-used";
import { ProposalDecision, ProposeEstimate } from "./estimate-proposal";
import { getShop, getSupabase, getUser, getNames } from "@/lib/session";

// The technician's view of one repair job. Unlike the claim slip and
// tracking page, this screen shows the customer's name and phone.
export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS: a job from another shop returns nothing -> "not found".
  const [{ data: job }, shop, names, { data: usedRows }, { data: partRows }, { data: proposal }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>(),
    getShop(),
    getNames(),
    // Parts used on this repair, and the catalog to pick from (ticket 28).
    supabase.from("job_parts").select("*").eq("job_id", id).order("created_at"),
    supabase.from("parts").select("*").order("name"),
    // The latest revised-estimate proposal on this repair (ticket 39). RLS:
    // staff see only their own, the owner sees the shop's.
    supabase
      .from("estimate_proposals")
      .select("id, staff_id, amount, reason, status, owner_note, created_at, decided_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!job) notFound();

  // Staff can only change the phones they handle; for anyone else's job
  // this page is read-only (the database enforces the same rule).
  const viewer: Viewer = { id: user.id, isOwner: shop?.role === "owner", names };
  const editable = canChange(job, viewer);
  const handler = nameOf(job.handled_by, viewer);
  const catalog = new Map((partRows ?? []).map((p) => [p.id as string, p]));
  const used = (usedRows ?? []).map((u) => ({
    id: u.id as string,
    name: catalog.get(u.part_id)?.name ?? "Part",
    sku: catalog.get(u.part_id)?.sku ?? "",
    quantity: u.quantity as number,
    unitPrice: Number(u.unit_price ?? 0),
  }));
  const pickable = (partRows ?? [])
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku, quantity: p.quantity, price: Number(p.retail_price ?? 0) }));

  const url = await trackingUrl(job.tracking_code);
  const late = isLate(job, todayInManila());

  // Parts used, inside "Update for the customer" (ticket 28).
  const partsUsed = (
    <section className="flex flex-col gap-3" aria-labelledby="parts-used">
      <div className="flex flex-col gap-0.5">
        <h3 id="parts-used" className="flex items-center gap-1.5 text-sm font-medium">
          <Package className="size-3.5 text-muted-foreground" aria-hidden />
          Parts used
        </h3>
        <p className="text-xs text-muted-foreground">Taken out of stock.</p>
      </div>
      <PartsUsed jobId={job.id} used={used} parts={pickable} editable={editable} />
    </section>
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
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
          <CopyMessageButton message={updateMessage(job, url)} />
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

      {!editable && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-muted px-4 py-3 text-sm"
        >
          <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            Handled by <span className="font-medium">{handler}</span>. Only {handler} or the shop owner can change it.
          </span>
        </p>
      )}

      {editable && job.cancel_requested_at && !isFinished(job.status) && (
        <CancelRequest jobId={job.id} reason={job.cancel_reason} requestedOn={formatDateTime(job.cancel_requested_at)} />
      )}

      {late && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50"
        >
          <div className="flex items-start gap-3">
            <AlarmClock className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">This repair is late</p>
              <p className="text-sm text-muted-foreground">
                It was promised for {formatDate(job.promised_date)}. The customer&apos;s tracking page now shows an
                apology. Let them know, and set a new promised date below.
              </p>
            </div>
          </div>
          <CopyMessageButton label="Copy delay message" message={delayMessage(job, url)} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-tertiary">Status</CardTitle>
          {editable && <CardDescription>Tap to change. The customer&apos;s page updates straight away.</CardDescription>}
        </CardHeader>
        <CardContent>
          {editable ? (
            <StatusPicker jobId={job.id} status={job.status} variant="buttons" price={currentPrice(job)} device={job.device} />
          ) : (
            <StatusBadge status={job.status} className="px-3 py-1 text-sm" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Handled by</dt>
            <dd>
              <HandledBy id={job.handled_by} viewer={viewer} />
            </dd>
            <dt className="text-muted-foreground">Quoted by</dt>
            <dd>{job.quoted_by === user.id ? "You" : nameOf(job.quoted_by, viewer)}</dd>
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{job.customer_name}</dd>
            <dt className="text-muted-foreground">Contact No.</dt>
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
                  {job.payment_ref && <span className="font-normal text-muted-foreground"> (ref …{job.payment_ref})</span>}
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

      {/* One card for everything the customer sees about the work: the
          update form, the revised estimate (ticket 39) and the parts used
          (ticket 28). Plain labels, no dividers, so it reads as one form.
          The owner answers a waiting proposal at the top. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-tertiary">Update for the customer</CardTitle>
          <CardDescription>Shown on the customer&apos;s tracking page, with the names of the parts used.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* The customer declined the revised estimate: what, when and
              why, in their own words (tickets 41–42). Everyone in the
              shop sees it, so whoever picks up the phone knows. */}
          {job.estimate_status === "declined" && job.revised_estimate !== null && (
            <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/50">
              <p className="flex items-center gap-2 font-medium text-red-800 dark:text-red-200">
                <ThumbsDown className="size-4" aria-hidden />
                The customer declined the revised estimate of{" "}
                <span className="tabular-nums">{formatPeso(job.revised_estimate)}</span>
              </p>
              {job.estimate_answered_at && (
                <p className="text-xs text-muted-foreground">{formatDateTime(job.estimate_answered_at)}</p>
              )}
              <p className="mt-1 whitespace-pre-line">
                {job.estimate_decline_reason ? (
                  <>
                    <span className="text-muted-foreground">Their reason: </span>&ldquo;{job.estimate_decline_reason}&rdquo;
                  </>
                ) : (
                  <span className="text-muted-foreground">No reason given.</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Contact them to agree what to do next, or set a new revised estimate.
              </p>
            </div>
          )}

          {/* The owner answered this staff member's proposal (ticket 42):
              the answer and the owner's note, whatever else has changed. */}
          {!viewer.isOwner && proposal && proposal.status !== "pending" && proposal.staff_id === user.id && (
            <div
              className={cn(
                "flex flex-col gap-1 rounded-[var(--radius)] border p-4 text-sm",
                proposal.status === "approved"
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
                  : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50",
              )}
            >
              <p className="flex items-center gap-2 font-medium text-tertiary">
                {proposal.status === "approved" ? (
                  <ThumbsUp className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden />
                ) : (
                  <ThumbsDown className="size-4 text-destructive" aria-hidden />
                )}
                Your owner {proposal.status === "approved" ? "approved" : "rejected"} your proposed estimate of{" "}
                <span className="tabular-nums">{formatPeso(proposal.amount)}</span>
              </p>
              {proposal.decided_at && (
                <p className="text-xs text-muted-foreground">{formatDateTime(proposal.decided_at)}</p>
              )}
              <p className="mt-1 whitespace-pre-line">
                {proposal.owner_note ? (
                  <>
                    <span className="text-muted-foreground">Owner&apos;s note: </span>&ldquo;{proposal.owner_note}&rdquo;
                  </>
                ) : (
                  <span className="text-muted-foreground">No note from the owner.</span>
                )}
              </p>
              {proposal.status === "approved" && (
                <p className="mt-1 text-xs text-muted-foreground">The customer is asked to accept the new price.</p>
              )}
            </div>
          )}

          {viewer.isOwner && proposal?.status === "pending" && (
            <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-highlight/40 bg-highlight/5 p-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <p className="flex items-center gap-2 font-medium text-tertiary">
                  <TrendingUp className="size-4 text-highlight" aria-hidden />
                  {nameOf(proposal.staff_id, viewer)} proposes a revised estimate of{" "}
                  <span className="tabular-nums">{formatPeso(proposal.amount)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Now {formatPeso(currentPrice(job))} · {formatDateTime(proposal.created_at)} · approving asks the
                  customer to accept it
                </p>
              </div>
              <p className="whitespace-pre-line">{proposal.reason}</p>
              <ProposalDecision proposalId={proposal.id} jobId={job.id} />
            </div>
          )}

          {editable ? (
            <JobDetailsForm job={job} canReviseEstimate={shop?.canReviseEstimate ?? false} />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-line">{job.notes || "–"}</dd>
              <dt className="text-muted-foreground">Parts replaced</dt>
              <dd>{job.parts_replaced || "–"}</dd>
            </dl>
          )}

          {/* Staff who propose a revised estimate get its fields here,
              then Parts used, then "Send to owner" last (ticket 39).
              Everyone else just gets Parts used. */}
          {!viewer.isOwner && editable && !(shop?.canReviseEstimate ?? false) && !isFinished(job.status) ? (
            <ProposeEstimate
              jobId={job.id}
              current={currentPrice(job)}
              last={
                proposal
                  ? {
                      amount: Number(proposal.amount),
                      reason: proposal.reason,
                      status: proposal.status,
                      ownerNote: proposal.owner_note,
                      sentOn: formatDateTime(proposal.created_at),
                    }
                  : null
              }
            >
              {partsUsed}
            </ProposeEstimate>
          ) : (
            partsUsed
          )}
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
