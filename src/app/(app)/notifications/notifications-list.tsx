import Link from "next/link";
import {
  AlarmClock,
  Ban,
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Clock,
  Hand,
  Hourglass,
  Inbox,
  MessageSquareText,
  Package,
  PackageX,
  PartyPopper,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Part } from "@/lib/inventory";
import { labourPrice, type Alert } from "@/lib/workspace";
import { formatPeso, type Job } from "@/lib/jobs";
import type { NewReview, OwnerAnswer } from "@/lib/session";
import { Stars } from "@/components/stars";
import { Card } from "@/components/ui/card";
import { SlidingTabs } from "@/components/sliding-tabs";
import { cn } from "@/lib/utils";

// A revised estimate a staff member proposed on an open repair.
export type Proposal = { id: string; job: Job; staffId: string; amount: number };

type Tone = "red" | "amber" | "green" | "blue" | "neutral";

const TONES: Record<Tone, string> = {
  red: "bg-red-50 text-destructive dark:bg-red-950",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  blue: "bg-highlight/10 text-highlight",
  neutral: "bg-muted text-tertiary",
};

const ALERT_LOOK: Record<Alert["kind"], { icon: LucideIcon; tone: Tone; group: GroupKey }> = {
  cancel: { icon: Ban, tone: "red", group: "action" },
  declined: { icon: ThumbsDown, tone: "red", group: "action" },
  approved: { icon: ThumbsUp, tone: "green", group: "action" },
  overdue: { icon: CalendarClock, tone: "red", group: "delays" },
  due_today: { icon: Clock, tone: "amber", group: "delays" },
  due_tomorrow: { icon: Hourglass, tone: "amber", group: "delays" },
  parts: { icon: Package, tone: "amber", group: "delays" },
  ready: { icon: CircleCheck, tone: "green", group: "waiting" },
  estimate: { icon: TrendingUp, tone: "blue", group: "waiting" },
};

type GroupKey = "action" | "delays" | "waiting" | "stock" | "updates";

const GROUPS: Record<GroupKey, { title: string; hint: string; icon: LucideIcon; tone: Tone }> = {
  action: { title: "Needs your decision", hint: "Customers and staff waiting on you.", icon: Hand, tone: "red" },
  delays: { title: "Delayed repairs", hint: "Late, due soon, or stuck waiting for parts.", icon: AlarmClock, tone: "amber" },
  waiting: { title: "Waiting on the customer", hint: "Ready to collect, or a revised quote to accept.", icon: UserRound, tone: "green" },
  stock: { title: "Low stock", hint: "Parts at or below their low-stock level.", icon: PackageX, tone: "amber" },
  updates: { title: "Updates", hint: "New reviews and your owner's answers, from the last two days.", icon: MessageSquareText, tone: "blue" },
};

// The filter tabs: which groups each one shows.
const FILTERS = [
  { key: "all", label: "All", groups: ["action", "delays", "waiting", "stock", "updates"] },
  { key: "action", label: "Needs action", groups: ["action"] },
  { key: "repairs", label: "Repairs", groups: ["delays", "waiting"] },
  { key: "stock", label: "Stock", groups: ["stock"] },
  { key: "updates", label: "Updates", groups: ["updates"] },
] as const satisfies readonly { key: string; label: string; groups: readonly GroupKey[] }[];

export type FilterKey = (typeof FILTERS)[number]["key"];
export const isFilter = (v: unknown): v is FilterKey => FILTERS.some((f) => f.key === v);

type Item = {
  key: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
  title: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
};

/**
 * The notification center (ticket 73): everything that needs the shop,
 * grouped (decisions, delays, waiting on customers, stock, updates),
 * with tabs to show one kind. Every row looks the same: an icon, what
 * happened, who it's about, and opens the repair (or Inventory / Staff).
 * These are reminders for the shop only: nothing is sent to customers.
 */
export function NotificationsList({
  show,
  alerts,
  me,
  names,
  lowStock,
  requests,
  proposals,
  answers,
  reviews,
}: {
  show: FilterKey;
  alerts: Alert[];
  me: string;
  names: Record<string, string>;
  lowStock: Part[]; // parts at or below their low-stock level (ticket 27)
  requests: number; // owner: staff requests to revise estimates (ticket 37)
  proposals: Proposal[]; // owner: revised estimates proposed on a repair (ticket 39)
  answers: OwnerAnswer[]; // staff: the owner approved or rejected what they sent (ticket 42)
  reviews: NewReview[]; // new customer reviews (ticket 62)
}) {
  const who = (id: string) => (id === me ? "You" : (names[id] ?? "Someone"));
  const groups: Record<GroupKey, Item[]> = { action: [], delays: [], waiting: [], stock: [], updates: [] };

  if (requests > 0) {
    groups.action.push({
      key: "requests",
      href: "/workspace?tab=staff",
      icon: Hand,
      tone: "blue",
      title: `${requests} request${requests === 1 ? "" : "s"} to revise quotes`,
      detail: "Staff are waiting for you to approve or reject.",
    });
  }
  for (const p of proposals) {
    groups.action.push({
      key: `proposal-${p.id}`,
      href: `/jobs/${p.job.id}`,
      icon: TrendingUp,
      tone: "blue",
      title: (
        <>
          {who(p.staffId)} proposes <span className="tabular-nums">{formatPeso(p.amount)}</span> for {p.job.device}
        </>
      ),
      detail: `Quote now ${formatPeso(labourPrice(p.job))}. Open it to approve or reject.`,
      meta: p.job.customer_name,
    });
  }
  for (const { job, kind, message } of alerts) {
    const look = ALERT_LOOK[kind];
    groups[look.group].push({
      key: `${kind}-${job.id}`,
      href: `/jobs/${job.id}`,
      icon: look.icon,
      tone: look.tone,
      title: job.device,
      detail: message,
      meta: `${job.customer_name} · ${who(job.handled_by)}`,
    });
  }
  for (const p of lowStock) {
    groups.stock.push({
      key: `low-${p.id}`,
      href: "/inventory",
      icon: PackageX,
      tone: p.quantity <= 0 ? "red" : "amber",
      title: p.name,
      detail: p.quantity < 0 ? "Stock count looks wrong: check it" : p.quantity === 0 ? "Out of stock" : `${p.quantity} left (low at ${p.low_stock_at})`,
      meta: p.sku,
    });
  }
  for (const r of reviews) {
    groups.updates.push({
      key: `review-${r.id}`,
      href: `/jobs/${r.jobId}`,
      icon: Star,
      tone: r.rating >= 4 ? "green" : r.rating <= 2 ? "red" : "amber",
      title: (
        <span className="flex flex-wrap items-center gap-2">
          New review for {r.device} <Stars rating={r.rating} />
        </span>
      ),
      detail: r.comment ? <span className="whitespace-pre-line">&ldquo;{r.comment}&rdquo;</span> : undefined,
      meta: r.technicianId !== me ? who(r.technicianId) : undefined,
    });
  }
  for (const a of answers) {
    groups.updates.push({
      key: `answer-${a.kind}-${a.id}`,
      href: a.kind === "proposal" ? `/jobs/${a.jobId}` : "/account",
      icon: a.approved ? ThumbsUp : ThumbsDown,
      tone: a.approved ? "green" : "red",
      title:
        a.kind === "proposal"
          ? `Your owner ${a.approved ? "approved" : "rejected"} your ${formatPeso(a.amount)} quote for ${a.device}`
          : `Your owner ${a.approved ? "approved" : "rejected"} your request to revise quotes`,
      detail: a.note ? <>Owner&apos;s note: &ldquo;{a.note}&rdquo;</> : "No note from the owner.",
      meta: a.kind === "proposal" && a.approved ? "The customer is being asked to accept it." : undefined,
    });
  }

  const count = (keys: readonly GroupKey[]) => keys.reduce((n, k) => n + groups[k].length, 0);
  const total = count(FILTERS[0].groups);
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];
  const visible = filter.groups.filter((g) => groups[g].length > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* At a glance: how many of each, as cards that filter. */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["action", "delays", "stock", "updates"] as const).map((g) => {
          const look = GROUPS[g];
          const n = g === "delays" ? count(["delays", "waiting"]) : groups[g].length;
          const key = g === "delays" ? "repairs" : g;
          return (
            <Link key={g} href={`/notifications?show=${key}`} scroll={false} className="group rounded-[var(--radius)]">
              <Card className={cn("flex items-center gap-3 p-4 transition-[border-color,box-shadow] group-hover:border-ring/40 group-hover:shadow-lg", show === key && "border-ring/50 ring-2 ring-ring/20")}>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONES[n ? look.tone : "neutral"])}>
                  <look.icon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xl font-semibold tabular-nums text-tertiary">{n}</span>
                  <span className="truncate text-xs text-muted-foreground">{FILTERS.find((f) => f.key === key)?.label}</span>
                </span>
              </Card>
            </Link>
          );
        })}
      </section>

      <SlidingTabs
        label="Show"
        active={filter.key}
        look="raised"
        items={FILTERS.map((f) => ({
          key: f.key,
          href: f.key === "all" ? "/notifications" : `/notifications?show=${f.key}`,
          label: f.label,
          extra: <span className="ml-1 text-xs tabular-nums opacity-70">{count(f.groups)}</span>,
        }))}
        className="max-w-full overflow-x-auto"
      />

      {visible.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {total === 0 ? <PartyPopper className="size-5" aria-hidden /> : <Inbox className="size-5" aria-hidden />}
          </span>
          <p className="font-medium text-tertiary">{total === 0 ? "All caught up" : "Nothing here"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {total === 0
              ? "Nothing needs your attention right now. New reminders appear here and on the bell."
              : "Nothing of this kind right now. The other tabs have the rest."}
          </p>
        </Card>
      ) : (
        visible.map((g) => {
          const look = GROUPS[g];
          return (
            <Card key={g} className="overflow-hidden">
              <section aria-labelledby={`group-${g}`}>
                <header className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <span className={cn("flex size-8 items-center justify-center rounded-inner", TONES[look.tone])}>
                    <look.icon className="size-4" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 id={`group-${g}`} className="flex items-center gap-2 font-semibold text-tertiary">
                      {look.title}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{groups[g].length}</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">{look.hint}</p>
                  </div>
                </header>
                <ul className="divide-y divide-border">
                  {groups[g].map((item) => (
                    <li key={item.key}>
                      <Row item={item} />
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          );
        })
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BellRing className="size-3.5" aria-hidden />
        Reminders for your shop only: nothing here is sent to customers.
      </p>
    </div>
  );
}

function Row({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group flex items-start gap-3 px-5 py-3.5 hover:bg-muted/60">
      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", TONES[item.tone])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <span className="font-medium text-tertiary">{item.title}</span>
        {item.detail && <span className="text-muted-foreground">{item.detail}</span>}
        {item.meta && <span className="text-xs text-muted-foreground/80">{item.meta}</span>}
      </span>
      <ChevronRight className="mt-2 size-4 text-muted-foreground opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transform-none" aria-hidden />
    </Link>
  );
}
