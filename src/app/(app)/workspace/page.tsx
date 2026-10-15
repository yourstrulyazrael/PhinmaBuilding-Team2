import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Clock, Settings2, UserCog, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayInManila, type Job } from "@/lib/jobs";
import { attentionAlerts, isLate, overdueAndAwaiting } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { getMyShop } from "@/lib/shop";
import { ShopSettings } from "./shop-settings";
import { StaffTab } from "./staff-tab";
import { CustomersTab } from "./customers-tab";
import { NotificationsTab } from "./notifications-tab";

// ownerOnly tabs are left out entirely for staff: not shown, and typing
// the address falls back to the first tab.
const TABS = [
  { key: "customers", label: "Customers", icon: UsersRound, ownerOnly: false },
  { key: "notifications", label: "Notifications", icon: Bell, ownerOnly: false },
  { key: "staff", label: "Staff", icon: UserCog, ownerOnly: true },
  { key: "settings", label: "Shop settings", icon: Settings2, ownerOnly: false },
] as const;

/**
 * The technician's Workspace: customers, notifications,
 * staff (owner only) and shop settings in one place. Everything is worked out from their own
 * jobs (src/lib/workspace.ts), so there are no extra tables.
 */
export default async function WorkspacePage({ searchParams }: PageProps<"/workspace">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only ever this shop's jobs and members, and this person's own
  // details plus their shopmates' names.
  const [{ data, error }, { data: technician }, shop, { data: members }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("*"),
    supabase.from("technicians").select("display_name, contact_number").eq("id", user.id).maybeSingle(),
    getMyShop(supabase, user.id),
    supabase.from("shop_members").select("*").order("joined_at"),
    supabase.from("technicians").select("id, display_name, contact_number"),
  ]);
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  const today = todayInManila();

  const { tab: tabParam } = await searchParams;
  const tabs = TABS.filter((t) => !t.ownerOnly || shop?.role === "owner");
  const tab = tabs.find((t) => t.key === tabParam)?.key ?? "customers";
  const alertCount = attentionAlerts(jobs, today).length;
  const panel = overdueAndAwaiting(jobs, today);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-8 md:py-10">
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
          Customers, reminders, staff and settings, all in one place.
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
              {key === "notifications" && alertCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{alertCount}</span>
              )}
            </Link>
          ))}
        </nav>
      </Card>

      {tab === "customers" && <CustomersTab jobs={jobs} />}
      {tab === "notifications" && (
        <NotificationsTab
          jobs={jobs}
          today={today}
          me={user.id}
          names={Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name]))}
        />
      )}
      {tab === "settings" && shop && (
        <ShopSettings
          shop={shop}
          displayName={technician?.display_name ?? ""}
          contactNumber={technician?.contact_number ?? ""}
        />
      )}
      {tab === "staff" && (
        <StaffTab
          staff={(members ?? []).map((m) => {
            const person = people?.find((p) => p.id === m.technician_id);
            return {
              id: m.technician_id,
              name: person?.display_name ?? "Unknown",
              contact: person?.contact_number ?? "",
              role: m.role,
              canReviseEstimate: m.can_revise_estimate === true,
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
