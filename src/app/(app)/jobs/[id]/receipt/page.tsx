import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { formatDate, formatPeso, paymentLabel, repairNumber, type Job } from "@/lib/jobs";
import { currentPrice, labourPrice, manilaDate, partsTotal, warrantyEnd } from "@/lib/workspace";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrintButton } from "../slip/print-button";
import { getNames, getShop, getSupabase, getUser } from "@/lib/session";

/**
 * The payment receipt handed over at pickup (ticket 58): what was paid
 * and how, the quote and each part, the total, and the warranty. It
 * carries the customer's name (it's theirs to keep) but never their
 * number. It says plainly that it isn't an official receipt.
 */
export default async function ReceiptPage({ params }: PageProps<"/jobs/[id]/receipt">) {
  const { id } = await params;
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");

  // RLS: only this shop's repair and its parts load.
  const [{ data: job }, shop, names, { data: usedRows }, { data: partRows }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>(),
    getShop(),
    getNames(),
    supabase.from("job_parts").select("part_id, quantity, unit_price").eq("job_id", id).order("created_at"),
    supabase.from("parts").select("id, name"),
  ]);
  if (!job) notFound();
  // Only once it has been paid for.
  if (job.amount_paid === null) redirect(`/jobs/${job.id}`);

  const partName = new Map((partRows ?? []).map((p) => [p.id as string, p.name as string]));
  const lines = (usedRows ?? []).map((u) => ({
    name: partName.get(u.part_id as string) ?? "Part",
    quantity: Number(u.quantity),
    amount: Number(u.unit_price) * Number(u.quantity),
  }));
  const total = currentPrice(job);
  const paid = Number(job.amount_paid);
  const balance = Math.round((total - paid) * 100) / 100;
  const paidOn = job.paid_at ? manilaDate(job.paid_at) : null;
  const days = shop?.warrantyDays ?? 0;
  const warrantyUntil = warrantyEnd(job, days);
  // A short, readable number to quote back to the shop.
  const number = repairNumber(job.id);
  const technician = names[job.handled_by] ?? "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 md:py-10 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href={`/jobs/${job.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-4" aria-hidden />
          Back to the repair
        </Link>
        <PrintButton />
      </div>

      <Card className="flex flex-col gap-5 p-6 print:mx-auto print:max-w-sm print:shadow-none">
        <header className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-4">
          <div className="flex items-center gap-2.5">
            <LogoMark alwaysLight />
            <div>
              <p className="font-semibold leading-tight text-tertiary">{shop?.name ?? "Zenith Repair"}</p>
              <p className="text-xs text-muted-foreground">{shop?.contact}</p>
              {shop?.address && <p className="text-xs text-muted-foreground">{shop.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment receipt</p>
            <p className="font-mono text-xs text-muted-foreground">No. {number}</p>
            {paidOn && <p className="text-xs text-muted-foreground">{formatDate(paidOn)}</p>}
          </div>
        </header>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd className="font-medium">{job.customer_name}</dd>
          <dt className="text-muted-foreground">Device</dt>
          <dd className="font-medium text-tertiary">{job.device}</dd>
          <dt className="text-muted-foreground">Repair</dt>
          <dd>{job.problem}</dd>
          {technician && (
            <>
              <dt className="text-muted-foreground">Technician</dt>
              <dd>{technician}</dd>
            </>
          )}
        </dl>

        {/* What it cost: the quote, each part, the total. */}
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-dashed border-border">
              <td className="py-2">
                {job.revised_estimate === null ? "Initial quote" : "Revised quote"}
                {job.revised_estimate !== null && (
                  <span className="block text-xs text-muted-foreground">Initial quote {formatPeso(job.initial_quote)}</span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">{formatPeso(labourPrice(job))}</td>
            </tr>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1">
                  {l.name}
                  {l.quantity > 1 && <span className="text-muted-foreground"> ×{l.quantity}</span>}
                </td>
                <td className="py-1 text-right tabular-nums">{formatPeso(l.amount)}</td>
              </tr>
            ))}
            {lines.length === 0 && partsTotal(job) === 0 && (
              <tr>
                <td className="py-1 text-muted-foreground">Parts</td>
                <td className="py-1 text-right text-muted-foreground">(None used, no additional charges.)</td>
              </tr>
            )}
            <tr className="border-t border-border font-semibold text-tertiary">
              <td className="pt-2">Total</td>
              <td className="pt-2 text-right tabular-nums">{formatPeso(total)}</td>
            </tr>
          </tbody>
        </table>

        {/* How it was paid. */}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-dashed border-border pt-4 text-sm">
          <dt className="text-muted-foreground">Amount paid</dt>
          <dd className="text-right font-semibold tabular-nums">{formatPeso(paid)}</dd>
          <dt className="text-muted-foreground">Paid by</dt>
          <dd className="text-right">
            {paymentLabel(job.payment_method)}
            {job.payment_ref && <span className="text-muted-foreground"> (ref …{job.payment_ref})</span>}
          </dd>
          {balance > 0 && (
            <>
              <dt className="text-muted-foreground">Balance</dt>
              <dd className="text-right font-medium tabular-nums">{formatPeso(balance)}</dd>
            </>
          )}
          {warrantyUntil && (
            <>
              <dt className="text-muted-foreground">Warranty</dt>
              <dd className="text-right">
                {days} days, until {formatDate(warrantyUntil)}
              </dd>
            </>
          )}
        </dl>

        <footer className="flex flex-col gap-1 border-t border-dashed border-border pt-4 text-center text-xs text-muted-foreground">
          <p className="font-medium text-tertiary">Thank you!</p>
          {shop?.slipNote && <p className="whitespace-pre-line">{shop.slipNote}</p>}
          <p>Acknowledgement of payment. This is not an official receipt.</p>
        </footer>
      </Card>
    </main>
  );
}
