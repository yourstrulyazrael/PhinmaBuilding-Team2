import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, ChartColumn, Clock, Settings2, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayInManila, type Job } from "@/lib/jobs";
import { attentionAlerts, isLate, overdueAndAwaiting } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { DetailsForm } from "../details/details-form";
import { CustomersTab } from "./customers-tab";
import { NotificationsTab } from "./notifications-tab";
import { AnalyticsTab } from "./analytics-tab";

const TABS = [
  { key: "customers", label: "Customers", icon: UsersRound },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "analytics", label: "Analytics", icon: ChartColumn },
  { key: "settings", label: "Shop settings", icon: Settings2 },
] as const;

/**
 * The technician's Workspace: customers, notifications, analytics and
 * shop settings in one place. Everything is worked out from their own
 * jobs (src/lib/workspace.ts), so there are no extra tables.
 */
export default async function WorkspacePage({ searchParams }: PageProps<"/workspace">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: only ever this shop's jobs, and this person's own details.
  const [{ data, error }, { data: technician }] = await Promise.all([
    supabase.from("jobs").select("*"),
    supabase.from("technicians").select("display_name, contact_number").eq("id", user.id).maybeSingle(),
  ]);
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  const today = todayInManila();

  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "customers";
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
          Customers, reminders, numbers and settings, all from your repair jobs.
        </p>
      </header>

      <Card className="p-1.5">
        <nav className="flex flex-wrap gap-1" aria-label="Workspace tools">
          {TABS.map(({ key, label, icon: Icon }) => (
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
      {tab === "notifications" && <NotificationsTab jobs={jobs} today={today} />}
      {tab === "analytics" && <AnalyticsTab jobs={jobs} today={today} />}
      {tab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <Settings2 className="size-4" aria-hidden />
              Shop settings
            </CardTitle>
            <CardDescription>
              Your name and contact number, shown on every claim slip and tracking page.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-md">
            <DetailsForm
              displayName={technician?.display_name ?? ""}
              contactNumber={technician?.contact_number ?? ""}
            />
          </CardContent>
        </Card>
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
