import { redirect } from "next/navigation";
import { KeyRound, Mail, Receipt, Store, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm, EmailForm, PasswordForm, ShopDetailsForm, SlipNoteForm } from "./account-forms";
import { getMe, getShop, getUser } from "@/lib/session";

/**
 * Account (ticket 34; was "My details"), opened from the avatar in the
 * top bar. Everyone edits their own name, number, email and password.
 * The owner also edits the store details and the claim slip. The old
 * /details and Workspace → Shop settings addresses redirect here.
 */
export default async function AccountPage() {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const user = await getUser();
  if (!user) redirect("/login");
  const [shop, me] = await Promise.all([getShop(), getMe()]);
  if (!shop) redirect("/setup");
  const owner = shop.role === "owner";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">Account</h1>
        <p className="text-sm text-muted-foreground">
          {owner ? "Your shop, your claim slip and how you sign in." : "Your details and how you sign in."}
        </p>
      </header>

      {owner && (
        <Section icon={Store} title="Store details" description="Shown on every claim slip and tracking page.">
          <ShopDetailsForm shopId={shop.id} name={shop.name} address={shop.address} phone={shop.phone} />
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
