import { Hand, Mail, Phone, UserPlus, UsersRound } from "lucide-react";
import type { Role } from "@/lib/shop";
import { formatDate } from "@/lib/jobs";
import { manilaDate } from "@/lib/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStaffForm } from "./staff-forms";
import { EstimateAccess, RequestDecision, StaffActions } from "./staff-controls";

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
};

// A staff member asking to revise estimates (ticket 37).
export type EstimateRequest = { id: string; staffName: string; reason: string; createdAt: string };

// The owner's Staff tab: requests waiting for an answer; a card per
// person with their sign-in email, number, when they joined and last
// signed in, and the repairs they handle (ticket 36), plus Edit, Remove
// and their estimate permission (ticket 37); and Add staff (ticket 22).
export function StaffTab({ staff, requests }: { staff: StaffMember[]; requests: EstimateRequest[] }) {
  return (
    <div className="flex flex-col gap-4">
      {requests.length > 0 && (
        <Card className="border-highlight/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <Hand className="size-4" aria-hidden />
              Requests to revise estimates
              <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-white dark:text-[#0f1729]">
                {requests.length}
              </span>
            </CardTitle>
            <CardDescription>
              Approve if the reason is fair: they can then set revised estimates on the repairs they handle. You can
              take it back any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-tertiary">{r.staffName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(manilaDate(r.createdAt))}</span>
                  </div>
                  <p className="whitespace-pre-line">{r.reason}</p>
                  <RequestDecision requestId={r.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <UsersRound className="size-4" aria-hidden />
            Staff
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {staff.length}
            </span>
          </CardTitle>
          <CardDescription>
            Everyone who can sign in to your shop. Passwords can&apos;t be shown to anyone: they are stored scrambled.
            Staff change theirs on their Account page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {staff.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-tertiary">{m.name}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {m.role === "owner" ? "Owner" : "Staff"}
                  </span>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="min-w-0">
                    {m.email ? (
                      <a href={`mailto:${m.email}`} className="inline-flex max-w-full items-center gap-1.5 hover:underline">
                        <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{m.email}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Run 018 in Supabase to see it</span>
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd>
                    {m.contact ? (
                      <a href={`tel:${m.contact.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                        <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                        {m.contact}
                      </a>
                    ) : (
                      "–"
                    )}
                  </dd>
                  <dt className="text-muted-foreground">Password</dt>
                  <dd className="text-muted-foreground">Hidden (can&apos;t be viewed)</dd>
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd>{formatDate(manilaDate(m.joinedAt))}</dd>
                  <dt className="text-muted-foreground">Last sign-in</dt>
                  <dd>{m.lastSignIn ? formatDate(manilaDate(m.lastSignIn)) : m.email ? "Never" : "–"}</dd>
                  <dt className="text-muted-foreground">Repairs</dt>
                  <dd>
                    {m.openJobs} open · {m.totalJobs} in total
                  </dd>
                </dl>

                {m.role === "apprentice" && (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    <EstimateAccess staffId={m.id} allowed={m.canReviseEstimate} />
                    <StaffActions staffId={m.id} name={m.name} contact={m.contact} openJobs={m.openJobs} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-tertiary">
            <UserPlus className="size-4" aria-hidden />
            Add staff
          </CardTitle>
          <CardDescription>Create an account for someone who works in your shop.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddStaffForm />
        </CardContent>
      </Card>
    </div>
  );
}
