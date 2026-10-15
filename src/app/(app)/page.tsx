import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CircleCheck, Clock, Plus, QrCode, Smartphone, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPeso, parseSort, searchJobs, sortJobs, todayInManila, type Job } from "@/lib/jobs";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPicker } from "@/components/status-picker";
import { cn } from "@/lib/utils";
import { isLate } from "@/lib/workspace";
import { JobSearch } from "./job-search";

const TABS = [
  { key: "all", label: "All jobs" },
  { key: "ready", label: "Ready" },
  { key: "parts", label: "Waiting on parts" },
] as const;

// The technician's landing page: greeting, three counts, and the
// Repair jobs list.
export default async function Overview({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: technician } = await supabase
    .from("technicians")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // The layout already sends anyone without a shop to Set up; this is a
  // safety net in case that ever changes.
  if (!technician) redirect("/setup");

  // RLS means this only ever returns jobs from the signed-in person's shop.
  const { data, error } = await supabase.from("jobs").select("*");
  if (error) throw error;
  const jobs = (data ?? []) as Job[];

  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? "all";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const sort = parseSort(params.sort);

  // The summary cards count every job; the list below shows only the
  // jobs that match the search, in the chosen order.
  const open = jobs.filter((j) => j.status !== "picked_up");
  const waitingOnParts = jobs.filter((j) => j.status === "waiting_for_parts");
  const ready = jobs.filter((j) => j.status === "ready_for_pickup");

  const matches = sortJobs(searchJobs(jobs, q), sort);
  const listed = {
    all: matches.filter((j) => j.status !== "picked_up"),
    ready: matches.filter((j) => j.status === "ready_for_pickup"),
    parts: matches.filter((j) => j.status === "waiting_for_parts"),
  };
  const shown = listed[tab];
  const done = matches.filter((j) => j.status === "picked_up");

  // Keeps the search and sort when switching tabs.
  function tabHref(key: (typeof TABS)[number]["key"], keepSearch = true) {
    const query = new URLSearchParams();
    if (key !== "all") query.set("tab", key);
    if (q && keepSearch) query.set("q", q);
    if (sort !== "promised") query.set("sort", sort);
    const s = query.toString();
    return s ? `/?${s}` : "/";
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Wrench className="size-3.5" aria-hidden />
            Your repair desk
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">
            {greeting()}, {technician.display_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your repair jobs today.
          </p>
        </div>
        <Link href="/jobs/new" className={buttonVariants()}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Add a repair
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-3 md:gap-4" aria-label="Summary">
        <StatCard label="Open repairs" value={open.length} caption="Jobs still in progress" icon={Wrench} tone="navy" />
        <StatCard label="Waiting on parts" value={waitingOnParts.length} caption="Keep an eye on these" icon={Clock} tone="amber" />
        <StatCard label="Ready for pickup" value={ready.length} caption="Customers can collect" icon={CircleCheck} tone="green" />
      </section>

      <Card className="overflow-hidden">
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

        <JobSearch q={q} sort={sort} tab={tab} clearHref={tabHref(tab, false)} />

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-4 md:px-6" aria-label="Filter repair jobs">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
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
          <JobList jobs={shown} />
        )}

        {tab === "all" && done.length > 0 && (
          <details className="group border-t border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground md:px-6">
              <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
              Done ({done.length})
            </summary>
            <JobList jobs={done} />
          </details>
        )}
      </Card>
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
  navy: "bg-indigo-50 text-tertiary",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-muted text-primary",
};

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof Wrench;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className="flex flex-col gap-2 p-3 md:gap-3 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground md:text-sm">{label}</p>
        <span className={cn("hidden size-8 shrink-0 items-center justify-center rounded-full sm:flex", TONES[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-tertiary md:text-3xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="hidden text-xs text-muted-foreground sm:block">{caption}</p>
    </Card>
  );
}

function EmptyState({ tab, q, clearHref }: { tab: string; q: string; clearHref: string }) {
  if (q) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground md:px-6">
        <p>No repairs match “{q}”.</p>
        <Link href={clearHref} className="font-medium text-primary underline-offset-4 hover:underline">
          Clear search
        </Link>
      </div>
    );
  }
  const message =
    tab === "ready"
      ? "No phones are ready for pickup."
      : tab === "parts"
        ? "No repairs are waiting on parts."
        : "No open repairs. Tap “Add a repair” when a phone comes in.";
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-6">{message}</p>;
}

// A table on tablet and laptop, a stack of cards on a phone.
function JobList({ jobs }: { jobs: Job[] }) {
  const today = todayInManila();

  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-6 py-3 font-medium">Device &amp; issue</th>
            <th className="px-3 py-3 font-medium">Customer</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Quote / estimate</th>
            <th className="px-3 py-3 font-medium">Promised by</th>
            <th className="px-6 py-3 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-border last:border-0">
              <td className="px-6 py-4">
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
              <td className="px-3 py-4">
                <StatusPicker jobId={job.id} status={job.status} variant="select" />
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
          <li key={job.id} className="flex gap-3 px-4 py-4">
            <DeviceIcon />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/jobs/${job.id}`} className="font-medium text-tertiary underline-offset-4 hover:underline">
                    {job.device}
                  </Link>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{job.problem}</p>
                </div>
                <StatusPicker jobId={job.id} status={job.status} variant="select" />
              </div>
              <p className="text-xs text-muted-foreground">{job.customer_name}</p>
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
