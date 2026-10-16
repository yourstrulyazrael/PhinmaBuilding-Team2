import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlarmClock, Ban, CalendarDays, ChevronRight, CircleCheck, Clock, CreditCard, Plus, QrCode, Smartphone, UsersRound, Wrench, X } from "lucide-react";
import { formatDate, formatPeso, isFinished, parseSort, searchJobs, sortJobs, todayInManila, type Job } from "@/lib/jobs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { cn } from "@/lib/utils";
import { currentPrice, isLate } from "@/lib/workspace";
import { JobSearch } from "./job-search";
import { PageHeader } from "@/components/page-header";
import { canChange, type Viewer } from "@/lib/people";
import { HandledBy } from "@/components/handled-by";
import { StatusBadge } from "@/components/status-badge";
import { getMe, getNames, getShop, getSupabase, getUser } from "@/lib/session";
import { ActivityFeed, KpiStrip, type JobEvent } from "./overview-panels";
import { RememberFilters } from "./remember-filters";
import { BulkProvider, SelectAll, SelectBox } from "./bulk-select";
import { FILTERS_COOKIE, unpackFilters } from "@/lib/overview-filters";

// "My jobs" (the phones you handle) comes first and is the default
// (ticket 13); "All jobs" is the whole shop.
const TABS = [
  { key: "mine", label: "My jobs" },
  { key: "all", label: "All jobs" },
  { key: "ready", label: "Ready" },
  { key: "parts", label: "Waiting on parts" },
] as const;

// The technician's landing page: greeting, three counts, and the
// Repair jobs list.
export default async function Overview({ searchParams }: PageProps<"/">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS means this only ever returns jobs from the signed-in person's shop,
  // and only their shopmates' names. All at once; the shop and the
  // person's details are shared with the layout (no extra trip).
  const [{ data, error }, shop, names, technician, { data: memberRows }, { data: eventRows, error: eventsError }] = await Promise.all([
    supabase.from("jobs").select("*"),
    getShop(),
    getNames(),
    getMe(),
    // The people to filter by (ticket 61): the shop's current members.
    supabase.from("shop_members").select("*").order("joined_at"),
    // Recent activity (ticket 69), written by the database (sql/031).
    supabase
      .from("job_events")
      .select("id, job_id, actor, kind, detail, created_at, job:jobs(device)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  // The layout already sends anyone without a shop to Set up; this is a
  // safety net in case that ever changes.
  if (!technician) redirect("/setup");
  const viewer: Viewer = { id: user.id, isOwner: shop?.role === "owner", names };
  if (error) throw error;
  const jobs = (data ?? []) as Job[];

  const fromAddress = await searchParams;
  // Remembered filters (ticket 71): plain "/" (the top bar, the logo)
  // opens the tab, sort and staff filter you used last, kept in a small
  // cookie on this browser. Any filter in the address wins, and is
  // remembered in turn. The search itself is never remembered.
  const named = ["tab", "q", "sort", "staff"].some((k) => k in fromAddress);
  const params: Record<string, string | string[] | undefined> = named
    ? fromAddress
    : { ...fromAddress, ...unpackFilters((await cookies()).get(FILTERS_COOKIE)?.value) };
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "mine";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const sort = parseSort(params.sort);
  // Only one person's repairs (ticket 61); ignored on My jobs, which is
  // already just yours. Anything not in the list counts as "all staff".
  const staffOptions = (memberRows ?? [])
    .filter((m) => !m.removed_at)
    .map((m) => ({
      id: m.technician_id as string,
      name: m.technician_id === user.id ? `${names[m.technician_id] ?? "You"} (you)` : (names[m.technician_id] ?? "Someone"),
    }));
  const staff =
    typeof params.staff === "string" && staffOptions.some((p) => p.id === params.staff) ? params.staff : "";
  // Set by cancelRepair after a repair is cancelled (ticket 51).
  const justCancelled = typeof params.cancelled === "string" ? params.cancelled.slice(0, 100) : "";

  // The summary cards count every job; the list below shows only the
  // jobs that match the search, in the chosen order.
  const open = jobs.filter((j) => !isFinished(j.status));
  const waitingOnParts = jobs.filter((j) => j.status === "waiting_for_parts");
  const ready = jobs.filter((j) => j.status === "ready_for_pickup");

  // Repairs that are late, or promised for today and not ready yet.
  const today = todayInManila();
  const lateJobs = open.filter((j) => isLate(j, today));
  const dueTodayJobs = open.filter((j) => j.status !== "ready_for_pickup" && j.promised_date === today);
  const lateCount = lateJobs.length;
  const dueTodayCount = dueTodayJobs.length;
  // "Let the customer know" for one person, "customers" for more. Two
  // repairs for the same person count once (same contact number).
  const customersToTell = new Set(
    [...lateJobs, ...dueTodayJobs].map((j) => j.customer_phone.replace(/\D/g, "") || j.id),
  ).size;

  const matches = sortJobs(
    searchJobs(jobs, q).filter((j) => !staff || tab === "mine" || j.handled_by === staff),
    sort,
    names,
  );
  const listed = {
    mine: matches.filter((j) => !isFinished(j.status) && j.handled_by === user.id),
    all: matches.filter((j) => !isFinished(j.status)),
    ready: matches.filter((j) => j.status === "ready_for_pickup"),
    parts: matches.filter((j) => j.status === "waiting_for_parts"),
  };
  const shown = listed[tab];
  // Picked up and cancelled jobs (only yours, on My jobs).
  const done = matches.filter((j) => isFinished(j.status) && (tab !== "mine" || j.handled_by === user.id));

  // Bulk actions (ticket 71): the open repairs on screen this person may
  // change. Warranty returns are left out (they go back one at a time).
  const selectable = shown
    .filter((j) => canChange(j, viewer) && !isFinished(j.status) && j.status !== "warranty")
    .map((j) => ({ id: j.id, status: j.status, handledBy: j.handled_by }));

  // Keeps the search, sort and staff filter when switching tabs.
  function tabHref(key: (typeof TABS)[number]["key"], keepSearch = true) {
    const query = new URLSearchParams();
    // Always named, so plain "/" can mean "my remembered view" (ticket 71).
    query.set("tab", key);
    if (q && keepSearch) query.set("q", q);
    if (sort !== "promised") query.set("sort", sort);
    if (staff) query.set("staff", staff);
    return `/?${query.toString()}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-6 px-4 py-6 md:px-8 md:py-10 2xl:px-12">
      <PageHeader
        eyebrow="Your repair desk"
        icon={Wrench}
        title={`${greeting()}, ${technician.display_name}`}
        description="Here's what's happening with your repair jobs today."
        actions={
          // Quick actions (ticket 69): the three things done most often.
          <>
            <Link href="/workspace" className={buttonVariants({ variant: "secondary" })}>
              <UsersRound className="size-4" aria-hidden />
              Find a customer
            </Link>
            <Link href="/?tab=ready#jobs" className={buttonVariants({ variant: "secondary" })}>
              <CreditCard className="size-4" aria-hidden />
              Record a payment
            </Link>
            <Link href="/jobs/new" className={buttonVariants()} aria-keyshortcuts="N">
              <Plus className="size-4" aria-hidden />
              New repair
            </Link>
          </>
        }
      />

      {justCancelled && <CancelledNotice device={justCancelled} />}
      <RememberFilters tab={tab} sort={sort} staff={staff} />

      {(lateCount > 0 || dueTodayCount > 0) && (
        <Link
          href="/notifications"
          className="flex items-center gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-950"
        >
          <AlarmClock className="size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <span className="flex-1 text-amber-900 dark:text-amber-100">
            {[
              lateCount > 0 && `${lateCount} repair${lateCount === 1 ? " is" : "s are"} late`,
              dueTodayCount > 0 && `${dueTodayCount} due today`,
            ]
              .filter(Boolean)
              .join(", ")}
            . Let the {customersToTell === 1 ? "customer" : "customers"} know.
          </span>
          <span className="font-medium text-amber-800 dark:text-amber-200">View</span>
        </Link>
      )}

      <section className="grid grid-cols-3 gap-3 md:gap-4" aria-label="Summary">
        <StatCard href="/?tab=all#jobs" label="Open repairs" value={open.length} caption="Jobs still in progress" icon={Wrench} tone="navy" />
        <StatCard href="/?tab=parts#jobs" label="Waiting on parts" value={waitingOnParts.length} caption="Keep an eye on these" icon={Clock} tone="amber" />
        <StatCard href="/?tab=ready#jobs" label="Ready for pickup" value={ready.length} caption="Customers can collect" icon={CircleCheck} tone="green" />
      </section>

      <KpiStrip jobs={jobs} today={today} isOwner={viewer.isOwner} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <BulkProvider jobs={selectable} people={viewer.isOwner ? staffOptions : null}>
      <Card id="jobs" className="scroll-mt-24 overflow-hidden">
        <div className="flex flex-col gap-1 px-4 pt-5 md:px-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-tertiary">
            Repair jobs
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {open.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep every device and customer update in one place.
          </p>
        </div>

        <JobSearch q={q} sort={sort} tab={tab} staff={staff} staffOptions={staffOptions} />

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-4 md:px-6" aria-label="Filter repair jobs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm font-medium",
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="text-xs opacity-70">{listed[t.key].length}</span>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <EmptyState tab={tab} q={q} clearHref={tabHref(tab, false)} />
        ) : (
          <JobList jobs={shown} viewer={viewer} bulk />
        )}

        {(tab === "all" || tab === "mine") && done.length > 0 && (
          <details className="group border-t border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground md:px-6">
              <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
              Done ({done.length})
            </summary>
            <JobList jobs={done} viewer={viewer} />
          </details>
        )}
      </Card>
      </BulkProvider>

      <ActivityFeed
        events={(eventRows ?? []) as unknown as JobEvent[]}
        missing={!!eventsError}
        names={names}
        me={user.id}
      />
      </div>
    </main>
  );
}

// Time of day in Manila, not on Vercel's UTC servers.
function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const TONES = {
  navy: "bg-indigo-50 text-tertiary dark:bg-indigo-950",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-muted text-primary",
};

// Each card opens the matching list (ticket 69).
function StatCard({
  href,
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  caption: string;
  icon: typeof Wrench;
  tone: keyof typeof TONES;
}) {
  return (
    <Link href={href} className="group rounded-[var(--radius)]">
    <Card className="card-lift flex h-full flex-col gap-2 p-3 md:gap-3 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground md:text-sm">{label}</p>
        <span className={cn("hidden size-8 shrink-0 items-center justify-center rounded-full sm:flex", TONES[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-tertiary md:text-3xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="hidden items-center justify-between gap-1 text-xs text-muted-foreground sm:flex">
        {caption}
        <span className="inline-flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </p>
    </Card>
    </Link>
  );
}

function EmptyState({ tab, q, clearHref }: { tab: string; q: string; clearHref: string }) {
  if (q) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground md:px-6">
        <p>No repairs match “{q}”.</p>
        <Link href={clearHref} scroll={false} className="font-medium text-primary underline-offset-4 hover:underline">
          Clear search
        </Link>
      </div>
    );
  }
  const message =
    tab === "mine"
      ? "You aren't handling any open repairs. Phones you add, or are given, appear here."
      : tab === "ready"
      ? "No phones are ready for pickup."
      : tab === "parts"
        ? "No repairs are waiting on parts."
        : "No open repairs. Tap “Add a repair” when a phone comes in.";
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-6">{message}</p>;
}

// A table on tablet and laptop, a stack of cards on a phone.
// `bulk`: tick boxes for bulk actions (ticket 71), inside a BulkProvider.
function JobList({ jobs, viewer, bulk = false }: { jobs: Job[]; viewer: Viewer; bulk?: boolean }) {
  const today = todayInManila();

  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            {bulk && (
              <th className="w-10 py-3 pl-6 pr-0 font-medium">
                <SelectAll />
              </th>
            )}
            <th className={cn("py-3 pr-6 font-medium", bulk ? "pl-3" : "pl-6")}>Device &amp; issue</th>
            <th className="px-3 py-3 font-medium">Customer</th>
            <th className="px-3 py-3 font-medium">Handled by</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Quote / estimate</th>
            <th className="px-3 py-3 font-medium">Est. completion</th>
            <th className="px-6 py-3 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/40 has-[:checked]:bg-primary/5">
              {bulk && (
                <td className="py-4 pl-6 pr-0 align-middle">
                  <SelectBox id={job.id} label={job.device} />
                </td>
              )}
              <td className={cn("py-4 pr-6", bulk ? "pl-3" : "pl-6")}>
                <div className="flex items-center gap-3">
                  <DeviceIcon />
                  <div className="min-w-0">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-tertiary underline-offset-4 hover:underline">
                    {job.device}
                  </Link>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{job.problem}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-4">{job.customer_name}</td>
              <td className="max-w-36 px-3 py-4">
                <HandledBy id={job.handled_by} viewer={viewer} />
              </td>
              <td className="px-3 py-4">
                <StatusControl job={job} viewer={viewer} />
              </td>
              <td className="px-3 py-4">
                <Quote job={job} />
              </td>
              <td className="px-3 py-4">
                <PromisedDate job={job} today={today} />
              </td>
              <td className="px-6 py-4 text-right">
                <SlipLink job={job} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden">
        {jobs.map((job) => (
          <li key={job.id} className="flex gap-3 px-4 py-4 has-[:checked]:bg-primary/5">
            {bulk && (
              <span className="flex h-9 items-center">
                <SelectBox id={job.id} label={job.device} />
              </span>
            )}
            <DeviceIcon />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/jobs/${job.id}`} className="font-medium text-tertiary underline-offset-4 hover:underline">
                    {job.device}
                  </Link>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{job.problem}</p>
                </div>
                <StatusControl job={job} viewer={viewer} />
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {job.customer_name}
                <span aria-hidden>·</span>
                <HandledBy id={job.handled_by} viewer={viewer} />
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <Quote job={job} />
                <PromisedDate job={job} today={today} />
                <SlipLink job={job} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function DeviceIcon() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-muted-foreground">
      <Smartphone className="size-4" aria-hidden />
    </span>
  );
}

function Quote({ job }: { job: Job }) {
  return (
    <span className="flex flex-col">
      <span className="font-medium tabular-nums">{formatPeso(job.initial_quote)}</span>
      {job.revised_estimate !== null && (
        <span className="text-xs text-muted-foreground">
          Revised {formatPeso(job.revised_estimate)}
        </span>
      )}
    </span>
  );
}

function PromisedDate({ job, today }: { job: Job; today: string }) {
  const late = isLate(job, today);
  return (
    <span className={cn("flex items-center gap-1.5", late ? "text-destructive" : "text-muted-foreground")}>
      <CalendarDays className="size-3.5" aria-hidden />
      {formatDate(job.promised_date)}
      {late && <span className="font-medium">· late</span>}
    </span>
  );
}

function SlipLink({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}/slip`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
    >
      <QrCode className="size-3.5" aria-hidden />
      Claim slip
    </Link>
  );
}

// The status dropdown on jobs you may change; a plain badge on anyone
// else's (staff can only change the phones they handle).
function StatusControl({ job, viewer }: { job: Job; viewer: Viewer }) {
  // Cancelled repairs are closed (ticket 51): a badge, not a menu.
  return canChange(job, viewer) && job.status !== "cancelled" ? (
    <StatusPicker jobId={job.id} status={job.status} variant="select" price={currentPrice(job)} device={job.device} />
  ) : (
    <StatusBadge status={job.status} />
  );
}

// "Done" after cancelling a repair (ticket 51), right where the
// technician lands. ✕ clears it from the address.
function CancelledNotice({ device }: { device: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm shadow-card"
    >
      <Ban className="size-5 shrink-0 text-destructive" aria-hidden />
      <p className="flex-1">
        <span className="font-medium">{device}</span> was cancelled. It&apos;s closed now, and the customer&apos;s
        tracking page shows it.
      </p>
      <Link
        href="/"
        aria-label="Dismiss"
        className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
