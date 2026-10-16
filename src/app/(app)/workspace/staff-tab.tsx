import { Hand, Mail, Phone, ShieldCheck, Star, UsersRound, Wrench } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/shop";
import { formatDate } from "@/lib/jobs";
import { manilaDate } from "@/lib/workspace";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { AddStaffButton, RequestDecision, StaffMenu } from "./staff-controls";
import { cn } from "@/lib/utils";

export type StaffMember = {
  id: string;
  name: string;
  contact: string;
  role: Role;
  canReviseEstimate: boolean;
  // From shop_staff_accounts (ticket 36); null before 018 is run.
  email: string | null;
  joinedAt: string;
  lastSignIn: string | null;
  openJobs: number;
  totalJobs: number;
  rating: { sum: number; count: number } | null; // from customers' reviews (ticket 62)
};

// A staff member asking to revise estimates (ticket 37).
export type EstimateRequest = { id: string; staffName: string; reason: string; createdAt: string };

/**
 * The owner's Staff tab (redesigned, ticket 74): requests waiting for an
 * answer at the top; then one card per person: who they are, how to
 * reach them (with copy buttons), three numbers (open repairs, total,
 * rating) and a ⋮ menu for Edit, Reset password, Take back quotes and
 * Remove, each in its own pop-up. Add staff is a button in the header.
 */
// isOwner: the owner manages everyone (⋮ menu) and can add a Lead; a
// lead technician sees the team, answers requests and adds Staff (ticket 83).
export function StaffTab({ staff, requests, isOwner }: { staff: StaffMember[]; requests: EstimateRequest[]; isOwner: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {requests.length > 0 && (
        <Card className="overflow-hidden border-highlight/40">
          <header className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="flex size-8 items-center justify-center rounded-inner bg-highlight/10 text-highlight">
              <Hand className="size-4" aria-hidden />
            </span>
            <div className="flex flex-col">
              <h2 className="flex items-center gap-2 font-semibold text-tertiary">
                Requests to revise quotes
                <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-white dark:text-[#0f1729]">{requests.length}</span>
              </h2>
              <p className="text-xs text-muted-foreground">Approve if the reason is fair. You can take it back any time.</p>
            </div>
          </header>
          <ul className="grid gap-px bg-border md:grid-cols-2">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 bg-card p-5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 font-medium text-tertiary">
                    <Avatar name={r.staffName} small />
                    {r.staffName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(manilaDate(r.createdAt))}</span>
                </div>
                <p className="whitespace-pre-line rounded-inner bg-muted/60 px-3 py-2">&ldquo;{r.reason}&rdquo;</p>
                <RequestDecision requestId={r.id} staffName={r.staffName} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-tertiary">
            <UsersRound className="size-5" aria-hidden />
            Your team
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{staff.length}</span>
          </h2>
          <p className="text-sm text-muted-foreground">Everyone who can sign in to your shop.</p>
        </div>
        <AddStaffButton allowLead={isOwner} />
      </div>

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {staff.map((m) => {
          const average = m.rating ? m.rating.sum / m.rating.count : null;
          return (
            <li key={m.id}>
              <Card className="flex h-full flex-col">
                {/* Who */}
                <div className="flex items-start gap-3 p-5 pb-4">
                  <Avatar name={m.name} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold text-tertiary">{m.name}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Chip tone={m.role === "owner" ? "primary" : m.role === "lead" ? "blue" : "muted"}>{ROLE_LABELS[m.role]}</Chip>
                      {m.role === "apprentice" && m.canReviseEstimate && (
                        <Chip tone="blue">
                          <ShieldCheck className="size-3" aria-hidden />
                          Can revise quotes
                        </Chip>
                      )}
                    </span>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <StaffMenu
                      role={m.role}
                      staffId={m.id}
                      name={m.name}
                      contact={m.contact}
                      openJobs={m.openJobs}
                      canReviseEstimate={m.canReviseEstimate}
                    />
                  )}
                </div>

                {/* How to reach them: plain text (no "which app?" prompt), with copy. */}
                <div className="flex flex-col gap-1 px-5 text-sm">
                  <ContactLine icon={Mail} value={m.email} what="Email" missing="Run 018 in Supabase to see it" />
                  <ContactLine icon={Phone} value={m.contact || null} what="Contact number" missing="No number" />
                </div>

                {/* Three numbers */}
                <dl className={cn("mx-5 my-4 grid divide-x divide-border rounded-inner border border-border text-center", isOwner ? "grid-cols-3" : "grid-cols-2")}>
                  <Stat icon={Wrench} label="Open" value={String(m.openJobs)} />
                  <Stat icon={Wrench} label="Total" value={String(m.totalJobs)} />
                  {/* Ratings: the owner sees everyone's; a lead only their own (RLS). */}
                  {isOwner && (
                  <Stat
                    icon={Star}
                    label={m.rating ? `${m.rating.count} review${m.rating.count === 1 ? "" : "s"}` : "No reviews"}
                    value={average === null ? "–" : average.toFixed(1)}
                    highlight={average !== null && average >= 4.5}
                  />
                  )}
                </dl>

                <p className="mt-auto border-t border-border px-5 py-3 text-xs text-muted-foreground">
                  Joined {formatDate(manilaDate(m.joinedAt))} · Last sign-in{" "}
                  {m.lastSignIn ? formatDate(manilaDate(m.lastSignIn)) : m.email ? "never" : "–"}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Passwords can&apos;t be shown to anyone: they are stored scrambled. If someone forgets theirs, use ⋮ › Reset
        password to give them a new one.
      </p>
    </div>
  );
}

// Initials in a circle; the colour is picked from the name, so each
// person keeps the same one.
const AVATAR_TONES = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
];

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  const tone = AVATAR_TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        small ? "size-6 text-[10px]" : "size-11 text-sm",
        tone,
      )}
    >
      {initials}
    </span>
  );
}

function Chip({ tone, children }: { tone: "primary" | "muted" | "blue"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "blue" && "bg-highlight/10 text-highlight",
      )}
    >
      {children}
    </span>
  );
}

function ContactLine({
  icon: Icon,
  value,
  what,
  missing,
}: {
  icon: typeof Mail;
  value: string | null;
  what: string;
  missing: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {value ? (
        <>
          <span className="min-w-0 select-all truncate">{value}</span>
          <CopyButton text={value} what={what} className="-my-1 size-6" />
        </>
      ) : (
        <span className="text-muted-foreground">{missing}</span>
      )}
    </span>
  );
}

function Stat({ icon: Icon, label, value, highlight = false }: { icon: typeof Mail; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col-reverse items-center gap-0.5 px-2 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("flex items-center gap-1 text-lg font-semibold tabular-nums text-tertiary", highlight && "text-primary")}>
        {Icon === Star && value !== "–" && <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />}
        {value}
      </dd>
    </div>
  );
}
