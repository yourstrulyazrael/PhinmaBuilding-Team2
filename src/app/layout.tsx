import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenith Repair",
  description: "Track phone repairs: log jobs, hand out QR claim slips, update status in one tap.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-border">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Zenith Repair
            </Link>
            {/* Only the signed-in technician sees these links. Customers on
                a tracking page see just the name. */}
            {user && (
              <div className="ml-auto flex items-center gap-1">
                <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Jobs
                </Link>
                <Link href="/details" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  My details
                </Link>
                <form action={signOut}>
                  <Button type="submit" variant="outline" size="sm">
                    Sign out
                  </Button>
                </form>
              </div>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
