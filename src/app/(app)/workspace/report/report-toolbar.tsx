"use client";

import { useState } from "react";
import Form from "next/form";
import { FileDown, FileSpreadsheet } from "lucide-react";
import type { Report } from "@/lib/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PESO = '"₱"#,##0.00';

/**
 * Month picker and the two exports (ticket 25). Hidden when printing.
 *
 * - Export PDF opens the device's print screen, where "Save as PDF" is
 *   one of the choices (same as the claim slip).
 * - Export Excel builds an .xlsx file right here in the browser, with a
 *   Summary sheet and a Jobs sheet. Nothing is sent anywhere.
 */
export function ReportToolbar({ report, shopName }: { report: Report; shopName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function exportExcel() {
    setBusy(true);
    setError(undefined);
    try {
      // Loaded only when needed, so other pages stay light.
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const bold = (value: string) => ({ value, fontWeight: "bold" as const });
      const peso = (value: number | null) => (value === null ? null : { value, format: PESO });

      const summary = [
        [bold(shopName)],
        [`Monthly report: ${report.monthLabel}`],
        [],
        [bold("Received"), report.received],
        [bold("Picked up"), report.pickedUp],
        [bold("Cancelled"), report.cancelled],
        [bold("Still open (received this month)"), report.stillOpen],
        [bold("Earned"), peso(report.earned)],
        [bold("Average turnaround (days)"), report.avgTurnaround === null ? null : Number(report.avgTurnaround.toFixed(1))],
        [],
        [bold("Payment method"), bold("Pickups"), bold("Total")],
        ...report.byMethod.map((m) => [m.label, m.count, peso(m.total)]),
        [],
        [bold("Status (received this month)"), bold("Jobs")],
        ...report.byStatus.map((s) => [s.label, s.count]),
      ];

      const headers = ["Received", "Device", "Problem", "Customer", "Status", "Initial quote", "Revised estimate", "Paid", "Method", "Ref", "Handled by"];
      const jobs = [
        headers.map(bold),
        ...report.rows.map((r) => [
          { value: new Date(`${r.received}T00:00:00Z`), type: Date, format: "mmm d, yyyy" },
          r.device,
          r.problem,
          r.customer,
          r.status,
          peso(r.initialQuote),
          peso(r.revisedEstimate),
          peso(r.paid),
          r.method,
          r.ref,
          r.handledBy,
        ]),
      ];

      await writeXlsxFile([
        { sheet: "Summary", data: summary, columns: [{ width: 34 }, { width: 14 }, { width: 16 }] },
        {
          sheet: "Jobs",
          data: jobs,
          columns: [12, 20, 30, 20, 16, 14, 16, 14, 10, 8, 18].map((width) => ({ width })),
        },
      ] as Parameters<typeof writeXlsxFile>[0]).toFile(`zenith-report-${report.month}.xlsx`);
    } catch {
      setError("Couldn't make the Excel file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      {/* A plain form: picking a month puts ?month=… in the address. */}
      <Form action="/workspace/report" className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="month">Month</Label>
          <Input
            id="month"
            name="month"
            type="month"
            defaultValue={report.month}
            key={report.month}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="w-44"
          />
        </div>
        <Button type="submit" variant="secondary">
          Show
        </Button>
      </Form>

      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={exportExcel} disabled={busy}>
            <FileSpreadsheet className="mr-1.5 size-4" aria-hidden />
            {busy ? "Making file…" : "Export Excel"}
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <FileDown className="mr-1.5 size-4" aria-hidden />
            Export PDF
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
