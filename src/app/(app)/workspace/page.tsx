import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, UserCog, UsersRound } from "lucide-react";
import { formatDate, isFinished, todayInManila, type Job } from "@/lib/jobs";
import { isLate, overdueAndAwaiting } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { StaffTab } from "./staff-tab";
import { CustomersTab } from "./customers-tab";
import { getShop, getSupabase, getUser } from "@/lib/session";

// ownerOnly tabs are left out entirely for staff: not shown, and typing
// the address falls back to the first tab.
const TABS = [
  { key: "customers", label: "Customers", icon: UsersRound, ownerOnly: false },
  { key: "staff", label: "Staff", icon: UserCog, ownerOnly: true },
] as const;

/**
 * The technician's Workspace: customers and staff
 * (owner only). Settings are on Account, notifications behind the bell
 * in the top bar (ticket 38). Everything is worked out from their own
 * jobs (src/lib/workspace.ts), so there are no extra tables.
 */
export default async function WorkspacePage({ searchParams }: PageProps<"/workspace">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS: only ever this shop's jobs and members, and
  // their shopmates' names.
  const [{ data, error }, shop, { data: members }, { data: people }] =
    await Promise.all([
    supabase.from("jobs").select("*"),
    getShop(),
    supabase.from("shop_members").select("*").order("joined_at"),
    supabase.from("technicians").select("id, display_name, contact_number"),
  ]);
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  const today = todayInManila();

  const { tab: tabParam } = await searchParams;
  // Shop settings moved to Account (ticket 34).
  if (tabParam === "settings") redirect("/account");
  // Notifications moved to the bell in the top bar (ticket 38).
  if (tabParam === "notifications") redirect("/notifications");
  const tabs = TABS.filter((t) => !t.ownerOnly || shop?.role === "owner");
  const tab = tabs.find((t) => t.key === tabParam)?.key ?? "customers";
  // The owner's Staff tab also shows each person's email and sign-ins
  // (ticket 36). Only fetched there; the database refuses anyone else.
  const { data: accounts } =
    tab === "staff" ? await supabase.rpc("shop_staff_accounts") : { data: null };
  const accountOf = new Map(
    ((accounts ?? []) as { id: string; email: string; created_at: string; last_sign_in_at: string | null }[]).map(
      (a) => [a.id, a],
    ),
  );
  // Requests to revise estimates waiting for the owner (ticket 37), for
  // the Staff tab and its badge. RLS only shows the owner their shop's.
  const { data: requestRows } =
    shop?.role === "owner"
      ? await supabase
          .from("estimate_requests")
          .select("id, staff_id, reason, created_at")
          .eq("status", "pending")
          .order("created_at")
      : { data: null };
  const requests = (requestRows ?? []).map((r) => ({
    id: r.id as string,
    staffName: people?.find((p) => p.id === r.staff_id)?.display_name ?? "Someone",
    reason: r.reason as string,
    createdAt: r.created_at as string,
  }));
  const panel = overdueAndAwaiting(jobs, today);

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-4 py-6 md:px-8 md:py-10 2xl:px-12">
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit" })}>
        <ArrowLeft className="mr-1.5 size-4" aria-hidden />
        Repair desk
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">Workspace tools</h1>
        <p className="text-sm text-muted-foreground">
          Customers and staff, all in one place.
        </p>
      </header>

      <Card className="p-1.5">
        <nav className="flex flex-wrap gap-1" aria-label="Workspace tools">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={key === "customers" ? "/workspace" : `/workspace?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                tab === key ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {key === "staff" && requests.length > 0 && (
                <span
                  className="rounded-full bg-highlight px-1.5 text-[11px] text-white dark:text-[#0f1729]"
                  title="Requests to revise estimates"
                >
                  {requests.length}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </Card>

      {tab === "customers" && <CustomersTab jobs={jobs} />}
      {tab === "staff" && (
        <StaffTab
          requests={requests}
          // Removed people (ticket 37) are no longer listed.
          staff={(members ?? []).filter((m) => !m.removed_at).map((m) => {
            const person = people?.find((p) => p.id === m.technician_id);
            const account = accountOf.get(m.technician_id);
            const theirs = jobs.filter((j) => j.handled_by === m.technician_id);
            return {
              id: m.technician_id,
              name: person?.display_name ?? "Unknown",
              contact: person?.contact_number ?? "",
              role: m.role,
              canReviseEstimate: m.can_revise_estimate === true,
              email: account?.email ?? null,
              joinedAt: m.joined_at,
              lastSignIn: account?.last_sign_in_at ?? null,
              openJobs: theirs.filter((j) => !isFinished(j.status)).length,
              totalJobs: theirs.length,
            };
          })}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <Clock className="size-4" aria-hidden />
            Overdue &amp; awaiting pickup
          </CardTitle>
        </CardHeader>
        <CardContent>
          {panel.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing overdue, and no phones waiting to be collected.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {panel.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                  <Link href={`/jobs/${job.id}`} className="font-medium text-tertiary underline-offset-4 hover:underline">
                    {job.device}
                  </Link>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <StatusBadge status={job.status} />
                    <span className={cn(isLate(job, today) && "font-medium text-destructive")}>
                      {isLate(job, today) ? "Late · promised " : "Promised "}
                      {formatDate(job.promised_date)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
