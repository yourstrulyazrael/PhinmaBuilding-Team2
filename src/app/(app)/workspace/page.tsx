import { isManager } from "@/lib/shop";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Clock, UserCog, UsersRound } from "lucide-react";
import { formatDate, isFinished, todayInManila, type Job } from "@/lib/jobs";
import { isLate, overdueAndAwaiting } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { SlidingTabs } from "@/components/sliding-tabs";
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
  // The Staff tab: the owner and lead technicians (ticket 83).
  const tabs = TABS.filter((t) => !t.ownerOnly || isManager(shop?.role));
  const tab = tabs.find((t) => t.key === tabParam)?.key ?? "customers";
  // The owner's Staff tab also shows each person's email and sign-ins
  // (ticket 36). Only fetched there; the database refuses anyone else.
  const { data: accounts } =
    tab === "staff" ? await supabase.rpc("shop_staff_accounts") : { data: null };
  // Each person's average rating from customers' reviews (ticket 62).
  const { data: reviewRows } =
    tab === "staff" ? await supabase.from("reviews").select("technician_id, rating") : { data: null };
  const ratingOf = new Map<string, { sum: number; count: number }>();
  for (const r of reviewRows ?? []) {
    const t = ratingOf.get(r.technician_id as string) ?? { sum: 0, count: 0 };
    t.sum += Number(r.rating);
    t.count += 1;
    ratingOf.set(r.technician_id as string, t);
  }
  const accountOf = new Map(
    ((accounts ?? []) as { id: string; email: string; created_at: string; last_sign_in_at: string | null }[]).map(
      (a) => [a.id, a],
    ),
  );
  // Requests to revise estimates waiting for the owner (ticket 37), for
  // the Staff tab and its badge. RLS only shows the owner their shop's.
  const { data: requestRows } =
    isManager(shop?.role)
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
      <PageHeader
        crumbs={[{ label: "Workspace" }]}
        eyebrow="Your workspace"
        icon={Briefcase}
        title="Workspace tools"
        description="Customers and staff, all in one place."
      />

      {/* A segmented switch whose white tile glides to the open tab
          (tickets 48 and 53). */}
      <SlidingTabs
        label="Workspace tools"
        look="raised"
        stretch
        active={tab}
        items={tabs.map(({ key, label, icon: Icon }) => ({
          key,
          href: key === "customers" ? "/workspace" : `/workspace?tab=${key}`,
          label: (
            <>
              <Icon className="size-4" aria-hidden />
              {label}
            </>
          ),
          extra:
            key === "staff" && requests.length > 0 ? (
              <span
                className="rounded-full bg-highlight px-1.5 text-[11px] text-white dark:text-[#0f1729]"
                title="Requests to revise quotes"
              >
                {requests.length}
              </span>
            ) : undefined,
        }))}
      />

      {tab === "customers" && <CustomersTab jobs={jobs} />}
      {tab === "staff" && (
        <StaffTab
          isOwner={shop?.role === "owner"}
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
              rating: ratingOf.get(m.technician_id) ?? null,
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
                      {isLate(job, today) ? "Late · est. completion " : "Est. completion "}
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
