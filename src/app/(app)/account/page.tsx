import { redirect } from "next/navigation";
import { Calculator, KeyRound, Mail, Receipt, Store, UserRound } from "lucide-react";
import { formatDate } from "@/lib/jobs";
import { manilaDate } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm, EmailForm, EstimateRequestForm, PasswordForm, ShopDetailsForm, SlipNoteForm } from "./account-forms";
import { getMe, getShop, getSupabase, getUser } from "@/lib/session";

/**
 * Account (ticket 34; was "My details"), opened from the avatar in the
 * top bar. Everyone edits their own name, number, email and password.
 * The owner also edits the store details and the claim slip; staff ask
 * to revise estimates (ticket 37). The old
 * /details and Workspace → Shop settings addresses redirect here.
 */
export default async function AccountPage() {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const user = await getUser();
  if (!user) redirect("/login");
  const [shop, me] = await Promise.all([getShop(), getMe()]);
  if (!shop) redirect("/setup");
  const owner = shop.role === "owner";

  // Staff: their latest request to revise estimates (ticket 37). RLS only
  // shows people their own requests.
  const { data: lastRequest } = owner
    ? { data: null }
    : await (await getSupabase())
        .from("estimate_requests")
        .select("status, reason, owner_note, created_at, decided_at")
        .eq("staff_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:py-10">
      <PageHeader
        eyebrow={owner ? "Owner" : "Staff"}
        icon={UserRound}
        title="Account"
        description={owner ? "Your shop, your claim slip and how you sign in." : "Your details and how you sign in."}
      />

      {owner && (
        <Section icon={Store} title="Store details" description="Shown on every claim slip and tracking page; the currency is used everywhere.">
          <ShopDetailsForm
            shopId={shop.id}
            name={shop.name}
            address={shop.address}
            phone={shop.phone}
            currency={shop.currency}
          />
        </Section>
      )}

      {owner && (
        <Section
          icon={Receipt}
          title="Claim slip"
          description="The slip you print or send when a phone comes in. It shows the store details above; add a note for your terms."
        >
          <SlipNoteForm shopId={shop.id} note={shop.slipNote} />
        </Section>
      )}

      <Section
        icon={UserRound}
        title="Your details"
        description={
          owner
            ? "Your name and number. If the shop has no phone of its own, customers see your number."
            : "Your name and number, seen by your shopmates."
        }
      >
        <DetailsForm displayName={me?.display_name ?? ""} contactNumber={me?.contact_number ?? ""} />
      </Section>

      {!owner && (
        <Section
          icon={Calculator}
          title="Revised quotes"
          description="Setting a revised quote changes what the customer is asked to pay, so it needs your owner's OK."
        >
          {shop.canReviseEstimate ? (
            <p className="text-sm">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Approved</span>{" "}
              You can set revised quotes on the repairs you handle.
              {lastRequest?.status === "approved" && lastRequest.owner_note && (
                <span className="mt-1 block text-muted-foreground">Owner&apos;s note: {lastRequest.owner_note}</span>
              )}
            </p>
          ) : lastRequest?.status === "pending" ? (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-xs font-medium text-highlight">Waiting</span>{" "}
                Sent {formatDate(manilaDate(lastRequest.created_at))}. Your owner will approve or reject it.
              </p>
              <p className="whitespace-pre-line text-muted-foreground">&ldquo;{lastRequest.reason}&rdquo;</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {lastRequest?.status === "rejected" && (
                <div className="flex flex-col gap-1 rounded-[var(--radius)] bg-muted p-3 text-sm">
                  <p>
                    <span className="font-medium">Not approved</span>
                    {lastRequest.decided_at && ` on ${formatDate(manilaDate(lastRequest.decided_at))}`}.
                  </p>
                  {lastRequest.owner_note && <p className="text-muted-foreground">Owner&apos;s note: {lastRequest.owner_note}</p>}
                  <p className="text-xs text-muted-foreground">You can ask again with a new reason.</p>
                </div>
              )}
              {lastRequest?.status === "approved" && (
                <p className="text-sm text-muted-foreground">Your owner has taken this permission back. You can ask again.</p>
              )}
              <EstimateRequestForm />
            </div>
          )}
        </Section>
      )}

      <Section icon={Mail} title="Email" description="The address you sign in with.">
        <EmailForm email={user.email ?? ""} pendingEmail={user.new_email ?? undefined} />
      </Section>

      <Section icon={KeyRound} title="Password" description="Change the password you sign in with.">
        <PasswordForm isOwner={owner} />
      </Section>
    </main>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-tertiary">
          <Icon className="size-4" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
