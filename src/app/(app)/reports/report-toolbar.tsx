"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import type { Report } from "@/lib/report";
import type { TrendPoint } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

const PESO = '"₱"#,##0.00';

/**
 * The two exports (tickets 25–26). Hidden when printing.
 *
 * - Export PDF opens the device's print screen, where "Save as PDF" is
 *   one of the choices (same as the claim slip).
 * - Export Excel builds an .xlsx file right here in the browser, with
 *   Summary, Trend and Jobs sheets. Nothing is sent anywhere.
 */
export function ReportToolbar({
  report,
  shopName,
  points,
  bucket,
}: {
  report: Report;
  shopName: string;
  points: TrendPoint[];
  bucket: "hour" | "day";
}) {
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
        [`Report: ${report.periodLabel}`],
        [],
        [bold("Received"), report.received],
        [bold("Picked up"), report.pickedUp],
        [bold("Cancelled"), report.cancelled],
        [bold("Still open (of those received)"), report.stillOpen],
        [bold("Earned"), peso(report.earned)],
        [bold("Average turnaround (days)"), report.avgTurnaround === null ? null : Number(report.avgTurnaround.toFixed(1))],
        [bold("Parts sold (retail)"), peso(report.parts.sold)],
        [bold("Parts cost"), peso(report.parts.cost)],
        [bold("Parts profit"), peso(report.parts.profit)],
        [],
        [bold("Payment method"), bold("Pickups"), bold("Total")],
        ...report.byMethod.map((m) => [m.label, m.count, peso(m.total)]),
        [],
        [bold("Status (of those received)"), bold("Jobs")],
        ...report.byStatus.map((s) => [s.label, s.count]),
      ];

      const trendSheet = [
        [bold(bucket === "hour" ? "Hour" : "Day"), bold("Received"), bold("Picked up"), bold("Earned")],
        ...points.map((p) => [p.label, p.received, p.pickedUp, peso(p.earned)]),
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
        { sheet: "Trend", data: trendSheet, columns: [12, 12, 12, 16].map((width) => ({ width })) },
        { sheet: "Jobs", data: jobs, columns: [12, 20, 30, 20, 16, 14, 16, 14, 10, 8, 18].map((width) => ({ width })) },
      ] as Parameters<typeof writeXlsxFile>[0]).toFile(`zenith-report-${report.periodKey}.xlsx`);
    } catch {
      setError("Couldn't make the Excel file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
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
  );
}
