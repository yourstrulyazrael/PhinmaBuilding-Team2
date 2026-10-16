import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  AlarmClock,
  Banknote,
  Camera,
  CircleCheck,
  ClipboardList,
  EyeOff,
  Lock,
  MessageSquareQuote,
  NotebookPen,
  Package,
  PackageCheck,
  Phone,
  QrCode,
  ReceiptText,
  Smartphone,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { formatDate, formatPeso, isFinished, paymentLabel, repairNumber, todayInManila, type Job } from "@/lib/jobs";
import { currentPrice, isLate, labourPrice, manilaDate, partsTotal, warrantyEnd } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { CopyMessageButton } from "@/components/copy-message-button";
import { trackingUrl } from "@/lib/tracking-url";
import { delayMessage, readyMessage, updateMessage } from "@/lib/update-message";
import { JobDetailsForm } from "./job-details-form";
import { canChange, nameOf, type Viewer } from "@/lib/people";
import { HandledBy } from "@/components/handled-by";
import { StatusBadge } from "@/components/status-badge";
import { CancelRequest } from "./cancel-request";
import { PartsUsed } from "./parts-used";
import { ReassignSelect } from "./reassign-select";
import { JobPhotos, type JobPhoto } from "./job-photos";
import { Stars } from "@/components/stars";
import { ProposalDecision, ProposeEstimate } from "./estimate-proposal";
import { getShop, getSupabase, getUser, getNames } from "@/lib/session";
import { InlineEdit } from "./inline-edit";
import { ActionBar } from "./action-bar";
import { ShareMenu } from "./share-menu";
import { RepairStepper } from "@/components/repair-stepper";
import { CopyButton } from "@/components/copy-button";

// The technician's view of one repair job. Unlike the claim slip and
// tracking page, this screen shows the customer's name and phone.
export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS: a job from another shop returns nothing -> "not found".
  const [{ data: job }, shop, names, { data: usedRows }, { data: partRows }, { data: proposal }, { data: memberRows }, { data: review }] = await Promise.all([
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
    // Who the owner can hand it to (ticket 44): the shop's current members.
    supabase.from("shop_members").select("*").order("joined_at"),
    // The customer's review (ticket 62). RLS: the owner, or the
    // technician it's about; anyone else gets nothing.
    supabase.from("reviews").select("rating, comment, created_at").eq("job_id", id).maybeSingle(),
  ]);
  if (!job) notFound();

  // Before-and-after photos (ticket 64): this repair's folder in the
  // private bucket, shown through links that work for an hour. Storage
  // RLS only lets the shop's own members list and open them.
  let photos: JobPhoto[] = [];
  if (shop) {
    const folder = `${shop.id}/${job.id}`;
    const { data: files } = await supabase.storage
      .from("job-photos")
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
    const named = (files ?? []).filter((f) => /^(before|after)-/.test(f.name));
    if (named.length) {
      const { data: signed } = await supabase.storage
        .from("job-photos")
        .createSignedUrls(named.map((f) => `${folder}/${f.name}`), 3600);
      photos = (signed ?? []).flatMap((s, i) =>
        s.signedUrl
          ? [{ path: `${folder}/${named[i].name}`, url: s.signedUrl, kind: named[i].name.startsWith("after-") ? "after" : "before" } as JobPhoto]
          : [],
      );
    }
  }

  // Staff can only change the phones they handle; for anyone else's job
  // this page is read-only (the database enforces the same rule).
  const viewer: Viewer = { id: user.id, isOwner: shop?.role === "owner", names };
  // A cancelled repair is closed for good (ticket 51): read-only for
  // everyone, and the database refuses changes too.
  const cancelled = job.status === "cancelled";
  const editable = canChange(job, viewer) && !cancelled;
  const handler = nameOf(job.handled_by, viewer);
  const catalog = new Map((partRows ?? []).map((p) => [p.id as string, p]));
  const used = (usedRows ?? []).map((u) => ({
    id: u.id as string,
    partId: u.part_id as string,
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
  // The warranty end date, once picked up (ticket 57).
  const warrantyUntil = warrantyEnd(job, shop?.warrantyDays ?? 0);
  const number = repairNumber(job.id);
  // Inline editing (ticket 70): the owner corrects device, problem and
  // customer details; whoever may change the repair can move the date.
  const ownerEdits = viewer.isOwner && !cancelled;

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

  const readyText = readyMessage(job, shop ?? { name: "", address: "", hours: "" }, url);
  const people = (memberRows ?? [])
    .filter((m) => !m.removed_at)
    .map((m) => ({
      id: m.technician_id as string,
      name: (m.technician_id === user.id ? "You" : nameOf(m.technician_id, viewer)) + (m.role === "owner" ? " (owner)" : ""),
    }));

  // The page: a slim header, any alerts, then two columns on a wide
  // screen. Left: the work (progress, the update for the customer,
  // photos). Right: the facts (customer, price, details, review). On a
  // phone it is one column.
  return (
    <main className={cn("mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-8 md:py-10", editable && "pb-28 md:pb-28")}>
      <PageHeader
        crumbs={[{ label: "Repairs", href: "/?tab=all" }, { label: `Repair ${number}` }]}
        eyebrow={
          <span className="inline-flex items-center gap-1">
            Repair {number}
            <CopyButton text={number} what="Repair number" className="-my-1.5 size-6 text-primary" />
          </span>
        }
        icon={Smartphone}
        title={<InlineEdit jobId={job.id} field="device" label="device" value={job.device} canEdit={ownerEdits} maxLength={100} inputClassName="text-xl font-semibold md:text-xl" />}
        description={
          <div className="flex flex-col gap-3">
            <InlineEdit jobId={job.id} field="problem" label="problem" value={job.problem} canEdit={ownerEdits} multiline maxLength={500} />
            <StatusBadge status={job.status} className="w-fit px-3 py-1 text-sm" />
          </div>
        }
        actions={
          <>
            <ShareMenu message={updateMessage(job, url)} url={url} trackingPath={`/track/${job.tracking_code}`} />
            <Link href={`/jobs/${job.id}/slip`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <QrCode className="size-4" aria-hidden />
              Claim slip
            </Link>
            {/* Once it's paid for (ticket 58). */}
            {job.amount_paid !== null && (
              <Link href={`/jobs/${job.id}/receipt`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <ReceiptText className="size-4" aria-hidden />
                Receipt
              </Link>
            )}
          </>
        }
      />

      {/* Alerts: only what needs doing now. */}
      {!editable && (
        <Notice tone="muted" icon={Lock}>
          {cancelled ? (
            <>This repair was cancelled, so it&apos;s closed: nothing on it can be changed.</>
          ) : (
            <>
              Handled by <span className="font-medium">{handler}</span>. Only {handler} or the shop owner can change it.
            </>
          )}
        </Notice>
      )}

      {editable && job.cancel_requested_at && !isFinished(job.status) && (
        <CancelRequest jobId={job.id} device={job.device} reason={job.cancel_reason} requestedOn={formatDateTime(job.cancel_requested_at)} />
      )}

      {late && (
        <Notice
          tone="amber"
          icon={AlarmClock}
          title="This repair is late"
          action={<CopyMessageButton label="Copy delay message" message={delayMessage(job, url)} />}
        >
          It was due {formatDate(job.promised_date)}. The customer&apos;s page shows an apology; let them know and set a new date.
        </Notice>
      )}

      {/* Marked ready: the message to send, one tap away (ticket 56). */}
      {job.status === "ready_for_pickup" && (
        <Notice
          tone="green"
          icon={PackageCheck}
          title="Ready for pickup: tell the customer"
          action={<CopyMessageButton label="Copy ready message" message={readyText} />}
        >
          <details className="group">
            <summary className="w-fit text-sm hover:text-foreground">
              <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
              Preview the message
            </summary>
            <p className="mt-2 whitespace-pre-line rounded-inner border border-emerald-200 bg-card p-3 text-sm text-foreground dark:border-emerald-900">
              {readyText}
            </p>
            {!shop?.hours && viewer.isOwner && (
              <p className="mt-2 text-xs">Tip: add your opening hours on Account and they&apos;ll be in this message.</p>
            )}
          </details>
        </Notice>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* --- The work --------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card id="status-card" className="scroll-mt-24">
            <Section
              icon={Activity}
              title="Progress"
              description={editable ? "Tap a status to change it. The customer's page updates straight away." : undefined}
            >
              {/* How far along it is (ticket 70). */}
              <RepairStepper status={job.status} />
              {editable && (
                <div className="border-t border-border pt-5">
                  <StatusPicker jobId={job.id} status={job.status} variant="buttons" price={currentPrice(job)} device={job.device} />
                </div>
              )}
            </Section>
          </Card>

          {/* Everything the customer sees about the work: answers and
              proposals, the update form, a revised estimate (ticket 39)
              and the parts used (ticket 28). */}
          <Card>
            <Section icon={NotebookPen} title="Update for the customer" description="Shown on their tracking page, with the names of the parts used.">
              {/* The customer declined the revised estimate (tickets 41–42). */}
              {job.estimate_status === "declined" && job.revised_estimate !== null && (
                <Callout
                  tone="red"
                  icon={ThumbsDown}
                  title={
                    <>
                      The customer declined the revised quote of <span className="tabular-nums">{formatPeso(job.revised_estimate)}</span>
                    </>
                  }
                  meta={job.estimate_answered_at ? formatDateTime(job.estimate_answered_at) : undefined}
                >
                  {job.estimate_decline_reason ? (
                    <>
                      <span className="text-muted-foreground">Their reason: </span>&ldquo;{job.estimate_decline_reason}&rdquo;
                    </>
                  ) : (
                    <span className="text-muted-foreground">No reason given.</span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Contact them to agree what to do next, or set a new revised quote.
                  </span>
                </Callout>
              )}

              {/* The owner answered this staff member's proposal (ticket 42). */}
              {!viewer.isOwner && proposal && proposal.status !== "pending" && proposal.staff_id === user.id && (
                <Callout
                  tone={proposal.status === "approved" ? "green" : "red"}
                  icon={proposal.status === "approved" ? ThumbsUp : ThumbsDown}
                  title={
                    <>
                      Your owner {proposal.status === "approved" ? "approved" : "rejected"} your proposed quote of{" "}
                      <span className="tabular-nums">{formatPeso(proposal.amount)}</span>
                    </>
                  }
                  meta={proposal.decided_at ? formatDateTime(proposal.decided_at) : undefined}
                >
                  {proposal.owner_note ? (
                    <>
                      <span className="text-muted-foreground">Owner&apos;s note: </span>&ldquo;{proposal.owner_note}&rdquo;
                    </>
                  ) : (
                    <span className="text-muted-foreground">No note from the owner.</span>
                  )}
                  {proposal.status === "approved" && (
                    <span className="mt-1 block text-xs text-muted-foreground">The customer is asked to accept the new quote.</span>
                  )}
                </Callout>
              )}

              {viewer.isOwner && proposal?.status === "pending" && !cancelled && (
                <Callout
                  tone="blue"
                  icon={TrendingUp}
                  title={
                    <>
                      {nameOf(proposal.staff_id, viewer)} proposes a revised quote of{" "}
                      <span className="tabular-nums">{formatPeso(proposal.amount)}</span>
                    </>
                  }
                  meta={`Quote now ${formatPeso(labourPrice(job))} · ${formatDateTime(proposal.created_at)} · approving asks the customer to accept it`}
                >
                  <span className="whitespace-pre-line">{proposal.reason}</span>
                  <div className="mt-3">
                    <ProposalDecision proposalId={proposal.id} jobId={job.id} />
                  </div>
                </Callout>
              )}

              {editable ? (
                <JobDetailsForm job={job} canReviseEstimate={shop?.canReviseEstimate ?? false} />
              ) : (
                <dl className="flex flex-col gap-4 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</dt>
                    <dd className="mt-1 whitespace-pre-line">{job.notes || "–"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Parts replaced</dt>
                    <dd className="mt-1">{job.parts_replaced || "–"}</dd>
                  </div>
                </dl>
              )}

              <div className="border-t border-border pt-5">
                {/* Staff who propose a revised estimate get its fields,
                    then Parts used, then "Send to owner" last (ticket 39). */}
                {!viewer.isOwner && editable && !(shop?.canReviseEstimate ?? false) && !isFinished(job.status) ? (
                  <ProposeEstimate
                    jobId={job.id}
                    current={labourPrice(job)}
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
              </div>
            </Section>
          </Card>

          {shop && (
            <Card>
              <Section icon={Camera} title="Before & after photos" description="The device as it came in, and as it goes out. Only your shop sees these.">
                <JobPhotos shopId={shop.id} jobId={job.id} photos={photos} editable={editable} />
              </Section>
            </Card>
          )}
        </div>

        {/* --- The facts ----------------------------------------------------- */}
        <aside className="flex flex-col gap-5">
          <Card>
            <Section icon={UserRound} title="Customer" compact>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  <InlineEdit jobId={job.id} field="customer_name" label="customer name" value={job.customer_name} canEdit={ownerEdits} maxLength={100} />
                </span>
                <span className="flex flex-wrap items-center gap-1 text-sm">
                  <InlineEdit
                    jobId={job.id}
                    field="customer_phone"
                    label="contact number"
                    type="tel"
                    value={job.customer_phone}
                    canEdit={ownerEdits}
                    maxLength={40}
                    display={
                      <a
                        href={`tel:${job.customer_phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {job.customer_phone}
                      </a>
                    }
                  />
                  <CopyButton text={job.customer_phone} what="Contact number" />
                </span>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <EyeOff className="mt-0.5 size-3.5" aria-hidden />
                Private: never on the claim slip or tracking page.
              </p>
            </Section>
          </Card>

          {/* Labour (quote, then any revised estimate) + parts = total (ticket 47). */}
          <Card>
            <Section icon={Banknote} title="Price" compact>
              <dl className="flex flex-col gap-2.5 text-sm">
                <Row label="Initial quote">
                  <span className={cn("tabular-nums", job.revised_estimate !== null && "text-muted-foreground line-through")}>
                    {formatPeso(job.initial_quote)}
                  </span>
                </Row>
                {job.revised_estimate !== null && (
                  <Row label="Revised quote">
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-medium tabular-nums">{formatPeso(job.revised_estimate)}</span>
                      <EstimateAnswer job={job} />
                    </span>
                  </Row>
                )}
                <Row label="Parts">
                  {partsTotal(job) > 0 ? (
                    <span className="tabular-nums">{formatPeso(partsTotal(job))}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">(None used, no additional charges.)</span>
                  )}
                </Row>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                  <dt className="font-medium text-tertiary">Total</dt>
                  <dd className="text-xl font-semibold tabular-nums text-tertiary">{formatPeso(currentPrice(job))}</dd>
                </div>
              </dl>
              {job.amount_paid !== null && (
                <div className="flex items-start gap-2 rounded-inner bg-emerald-50 px-3 py-2.5 text-sm dark:bg-emerald-950/50">
                  <CircleCheck className="mt-0.5 size-4 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  <span>
                    <span className="font-medium">
                      Paid {formatPeso(job.amount_paid)} by {paymentLabel(job.payment_method)}
                    </span>
                    {job.payment_ref && <span className="text-muted-foreground"> (ref …{job.payment_ref})</span>}
                    {job.paid_at && <span className="block text-xs text-muted-foreground">{formatDateTime(job.paid_at)}</span>}
                  </span>
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section icon={ClipboardList} title="Details" compact>
              <dl className="flex flex-col gap-2.5 text-sm">
                <Row label="Handled by">
                  {/* The owner can hand it to someone else (ticket 44). */}
                  {viewer.isOwner && !cancelled ? (
                    <ReassignSelect jobId={job.id} handledBy={job.handled_by} people={people} />
                  ) : (
                    <HandledBy id={job.handled_by} viewer={viewer} />
                  )}
                </Row>
                <Row label="Quoted by">{job.quoted_by === user.id ? "You" : nameOf(job.quoted_by, viewer)}</Row>
                <Row label="Drop-off date">{formatDate(manilaDate(job.created_at))}</Row>
                <Row label="Est. completion">
                  <InlineEdit
                    jobId={job.id}
                    field="promised_date"
                    label="estimated completion date"
                    type="date"
                    value={job.promised_date}
                    display={<span className={cn(late && "font-medium text-destructive")}>{formatDate(job.promised_date)}</span>}
                    canEdit={editable}
                  />
                </Row>
                {/* Warranty from pickup (ticket 57). */}
                {warrantyUntil && (
                  <Row label="Warranty">
                    {warrantyUntil >= todayInManila() ? (
                      <span>
                        Until <span className="font-medium">{formatDate(warrantyUntil)}</span>
                        <span className="block text-xs text-muted-foreground">{shop?.warrantyDays} days</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Ended {formatDate(warrantyUntil)}</span>
                    )}
                  </Row>
                )}
              </dl>
            </Section>
          </Card>

          {review && (
            <Card>
              <Section icon={MessageSquareQuote} title="Customer review" compact>
                <span className="flex items-center justify-between gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(review.created_at)}</span>
                </span>
                {review.comment && <p className="whitespace-pre-line text-sm">&ldquo;{review.comment}&rdquo;</p>}
              </Section>
            </Card>
          )}
        </aside>
      </div>

      {/* Always-there actions once the Progress card scrolls away (ticket 70). */}
      {editable && (
        <ActionBar
          watch="status-card"
          jobId={job.id}
          number={number}
          status={job.status}
          price={currentPrice(job)}
          device={job.device}
          trackingUrl={url}
        />
      )}
    </main>
  );
}

// A card's heading and body, the same in every card on this page.
function Section({
  icon: Icon,
  title,
  description,
  compact = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean; // the narrower sidebar cards
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col", compact ? "gap-4 p-5" : "gap-5 p-5 md:p-6")}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-tertiary">
          <span className="flex size-7 items-center justify-center rounded-inner bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// "Label ........ value" in the sidebar cards.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 justify-end text-right">{children}</dd>
    </div>
  );
}

const NOTICE_TONES = {
  muted: { box: "border-border bg-muted", icon: "text-muted-foreground", title: "" },
  amber: {
    box: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    icon: "text-amber-700 dark:text-amber-300",
    title: "text-amber-800 dark:text-amber-200",
  },
  green: {
    box: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
    icon: "text-emerald-700 dark:text-emerald-300",
    title: "text-emerald-800 dark:text-emerald-200",
  },
};

// A banner above the columns: icon, title, a line of text, and a button
// on the right (underneath on a phone).
function Notice({
  tone,
  icon: Icon,
  title,
  action,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon: LucideIcon;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const look = NOTICE_TONES[tone];
  return (
    <div role="status" className={cn("flex flex-wrap items-start gap-3 rounded-[var(--radius)] border px-4 py-3", look.box)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", look.icon)} aria-hidden />
      <div className="flex min-w-0 flex-1 basis-60 flex-col gap-0.5 text-sm">
        {title && <p className={cn("font-medium", look.title)}>{title}</p>}
        <div className={title ? "text-muted-foreground" : undefined}>{children}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

const CALLOUT_TONES = {
  red: { box: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50", icon: "text-destructive" },
  green: {
    box: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50",
    icon: "text-emerald-700 dark:text-emerald-300",
  },
  blue: { box: "border-highlight/40 bg-highlight/5", icon: "text-highlight" },
};

// A message inside the update card: a proposal, or an answer to one.
function Callout({
  tone,
  icon: Icon,
  title,
  meta,
  children,
}: {
  tone: keyof typeof CALLOUT_TONES;
  icon: LucideIcon;
  title: React.ReactNode;
  meta?: string;
  children: React.ReactNode;
}) {
  const look = CALLOUT_TONES[tone];
  return (
    <div className={cn("flex flex-col gap-1 rounded-[var(--radius)] border p-4 text-sm", look.box)}>
      <p className="flex items-start gap-2 font-medium text-tertiary">
        <Icon className={cn("mt-0.5 size-4 shrink-0", look.icon)} aria-hidden />
        <span>{title}</span>
      </p>
      {meta && <p className="pl-6 text-xs text-muted-foreground">{meta}</p>}
      <div className="mt-1 pl-6">{children}</div>
    </div>
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
