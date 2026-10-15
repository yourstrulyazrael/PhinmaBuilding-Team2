import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { formatDate, formatPeso, type Job } from "@/lib/jobs";
import { currentPrice, partsTotal, warrantyEnd } from "@/lib/workspace";
import { qrSvg, trackingUrl } from "@/lib/tracking-url";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrintButton } from "./print-button";
import { SaveImageButton } from "./save-image-button";
import { getShop, getSupabase, getUser, getNames } from "@/lib/session";

/**
 * The claim slip the customer takes home. It deliberately leaves out
 * the customer's name and phone number: if the slip is lost, whoever
 * finds it learns nothing private.
 */
export default async function ClaimSlipPage({ params }: PageProps<"/jobs/[id]/slip">) {
  const { id } = await params;
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS: only jobs from this person's shop load, so any other
  // job id simply returns nothing. The slip shows the shop's name and
  // the owner's contact, not whoever happens to be signed in.
  const [{ data: job }, shop, names] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>(),
    getShop(),
    getNames(),
  ]);
  if (!job) notFound();
  // "Your technician": just a name, never their number (ticket 13).
  const technician = names[job.handled_by] ?? "";

  const url = await trackingUrl(job.tracking_code);
  const qr = await qrSvg(url);
  const receivedOn = new Date(job.created_at).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  // Warranty (ticket 57): "30 days from pickup" before, the end date after.
  const days = shop?.warrantyDays ?? 0;
  const warrantyUntil = warrantyEnd(job, days);
  const warranty = days > 0 ? (warrantyUntil ? `Until ${formatDate(warrantyUntil)}` : `${days} days from pickup`) : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 md:py-10 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden />
          Repair jobs
        </Link>
        <div className="flex gap-2">
          <SaveImageButton
            slip={{
              shopName: shop?.name ?? "Zenith Repair",
              shopContact: shop?.contact ?? "",
              shopAddress: shop?.address ?? "",
              note: shop?.slipNote ?? "",
              rows: [
                ["Device", job.device],
                ["Problem", job.problem],
                ["Initial quote", formatPeso(job.initial_quote)],
                ...(job.revised_estimate !== null
                  ? [["Revised quote", formatPeso(job.revised_estimate)] as [string, string]]
                  : []),
                ...(partsTotal(job) > 0
                  ? ([
                      ["Parts", formatPeso(partsTotal(job))],
                      ["Total so far", formatPeso(currentPrice(job))],
                    ] as [string, string][])
                  : [["Parts", "(None used, no additional charges.)"] as [string, string]]),
                ["Drop-off date", formatDate(receivedOn)],
                ["Estimated completion date", formatDate(job.promised_date)],
                ...(warranty ? [["Warranty", warranty] as [string, string]] : []),
                ...(technician ? [["Your technician", technician] as [string, string]] : []),
              ],
              url,
              fileName: `claim-slip-${job.device.replace(/[^\w-]+/g, "-").toLowerCase()}.png`,
            }}
          />
          <PrintButton />
        </div>
      </div>

      <Card className="flex flex-col gap-5 p-6 print:mx-auto print:max-w-sm print:shadow-none">
        <header className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-4">
          <div className="flex items-center gap-2.5">
            <LogoMark alwaysLight />
            <div>
              <p className="font-semibold leading-tight text-tertiary">
                {shop?.name ?? "Zenith Repair"}
              </p>
              <p className="text-xs text-muted-foreground">{shop?.contact}</p>
              {shop?.address && <p className="text-xs text-muted-foreground">{shop.address}</p>}
            </div>
          </div>
          <p className="text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Claim slip
          </p>
        </header>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Device</dt>
          <dd className="font-medium text-tertiary">{job.device}</dd>
          <dt className="text-muted-foreground">Problem</dt>
          <dd>{job.problem}</dd>
          <dt className="text-muted-foreground">Initial quote</dt>
          <dd className="font-medium tabular-nums">{formatPeso(job.initial_quote)}</dd>
          {job.revised_estimate !== null && (
            <>
              <dt className="text-muted-foreground">Revised quote</dt>
              <dd className="font-medium tabular-nums">{formatPeso(job.revised_estimate)}</dd>
            </>
          )}
          {/* Parts are charged on top of the quote (ticket 47). */}
          <dt className="text-muted-foreground">Parts</dt>
          {partsTotal(job) > 0 ? (
            <dd className="font-medium tabular-nums">{formatPeso(partsTotal(job))}</dd>
          ) : (
            <dd className="text-muted-foreground">(None used, no additional charges.)</dd>
          )}
          {partsTotal(job) > 0 && (
            <>
              <dt className="text-muted-foreground">Total so far</dt>
              <dd className="font-semibold tabular-nums text-tertiary">{formatPeso(currentPrice(job))}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Drop-off date</dt>
          <dd>{formatDate(receivedOn)}</dd>
          <dt className="text-muted-foreground">Estimated completion date</dt>
          <dd className="font-medium">{formatDate(job.promised_date)}</dd>
          {warranty && (
            <>
              <dt className="text-muted-foreground">Warranty</dt>
              <dd>{warranty}</dd>
            </>
          )}
          {technician && (
            <>
              <dt className="text-muted-foreground">Your technician</dt>
              <dd>{technician}</dd>
            </>
          )}
        </dl>

        <div className="flex flex-col items-center gap-2 border-t border-dashed border-border pt-5">
          {/* The SVG is made on our own server by the qrcode package. */}
          <div
            className="size-48 [&>svg]:size-full"
            role="img"
            aria-label="QR code for the repair tracking page"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="text-sm font-medium text-tertiary">Scan to check your repair status</p>
          <p className="break-all text-center text-[11px] text-muted-foreground">{url}</p>
        </div>

        {/* The owner's note, set on the Account page (ticket 34). */}
        {shop?.slipNote && (
          <p className="whitespace-pre-line border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
            {shop.slipNote}
          </p>
        )}
      </Card>
    </main>
  );
}
