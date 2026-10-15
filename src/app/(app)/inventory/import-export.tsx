"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileJson, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { importParts } from "./actions";
import {
  download,
  downloadXlsx,
  readFile,
  rowsFromTable,
  templateRows,
  toCsv,
  toJson,
  type FileRow,
  type Problem,
} from "@/lib/inventory-io";
import { formatPeso } from "@/lib/jobs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Format = "csv" | "xlsx" | "json";
type Plan = { row: FileRow; action: "new" | "update" | "same"; stockChange: number };

const FORMATS: { key: Format; label: string; icon: typeof FileText }[] = [
  { key: "csv", label: "CSV", icon: FileText },
  { key: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { key: "json", label: "JSON", icon: FileJson },
];

function save(rows: FileRow[], format: Format, baseName: string) {
  if (format === "csv") return download(toCsv(rows), `${baseName}.csv`, "text/csv;charset=utf-8");
  if (format === "json") return download(toJson(rows), `${baseName}.json`, "application/json");
  return downloadXlsx(rows, `${baseName}.xlsx`);
}

/**
 * Templates, import and export (ticket 31), owner only. Importing shows
 * a preview first; nothing changes until Import is pressed.
 */
export function ImportExport({ current }: { current: FileRow[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>();
  const [plan, setPlan] = useState<Plan[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [message, setMessage] = useState<{ kind: "error" | "done"; text: string }>();
  const [pending, startTransition] = useTransition();

  const bySku = new Map(current.map((r) => [r.sku.toLowerCase(), r]));
  const today = new Date().toISOString().slice(0, 10);

  async function choose(file: File | undefined) {
    setMessage(undefined);
    setPlan([]);
    setProblems([]);
    if (!file) return;
    setFileName(file.name);
    try {
      const { rows, problems } = rowsFromTable(await readFile(file));
      setProblems(problems);
      setPlan(
        rows.map((row) => {
          const old = bySku.get(row.sku.toLowerCase());
          if (!old) return { row, action: "new", stockChange: row.quantity };
          const same =
            old.name === row.name && old.cost === row.cost && old.retail_price === row.retail_price &&
            old.quantity === row.quantity && old.low_stock_at === row.low_stock_at;
          return { row, action: same ? "same" : "update", stockChange: row.quantity - old.quantity };
        }),
      );
      if (rows.length === 0 && problems.length === 0) setMessage({ kind: "error", text: "No parts found in that file." });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Couldn't read that file." });
    }
  }

  function runImport() {
    const rows = plan.filter((p) => p.action !== "same").map((p) => p.row);
    startTransition(async () => {
      const result = await importParts(rows);
      if (result.error) return setMessage({ kind: "error", text: result.error });
      setMessage({ kind: "done", text: `Imported: ${result.created} new, ${result.updated} updated.` });
      setPlan([]);
      setProblems([]);
      setFileName(undefined);
      if (input.current) input.current.value = "";
    });
  }

  const counts = {
    new: plan.filter((p) => p.action === "new").length,
    update: plan.filter((p) => p.action === "update").length,
    same: plan.filter((p) => p.action === "same").length,
  };
  const toImport = counts.new + counts.update;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormatRow title="1. Download a template" hint="Fill it in with your parts, keeping the first row as is.">
          {FORMATS.map(({ key, label, icon: Icon }) => (
            <Button key={key} type="button" size="sm" variant="secondary" onClick={() => save(templateRows(), key, "inventory-template")}>
              <Icon className="mr-1.5 size-4" aria-hidden />
              {label}
            </Button>
          ))}
        </FormatRow>
        <FormatRow title="Export your inventory" hint="Same columns as the template: edit it and import it back.">
          {FORMATS.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant="secondary"
              disabled={current.length === 0}
              onClick={() => save(current, key, `inventory-${today}`)}
            >
              <Download className="mr-1.5 size-4" aria-hidden />
              <Icon className="mr-1 size-4" aria-hidden />
              {label}
            </Button>
          ))}
        </FormatRow>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">2. Import a file</p>
        <p className="text-xs text-muted-foreground">
          CSV, Excel (.xlsx) or JSON. You&apos;ll see what will change before anything is saved. Matching SKUs are updated, and
          a different quantity is recorded as a stock adjustment.
        </p>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-dashed border-input px-4 py-3 text-sm hover:bg-muted">
          <Upload className="size-4" aria-hidden />
          {fileName ?? "Choose a file…"}
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      </div>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={cn("text-sm", message.kind === "error" ? "text-destructive" : "text-primary")}>
          {message.text}
        </p>
      )}

      {problems.length > 0 && (
        <div role="alert" className="rounded-[var(--radius)] border border-destructive/40 bg-red-50 p-3 text-sm dark:bg-red-950/40">
          <p className="font-medium text-destructive">
            {problems.length} row{problems.length === 1 ? "" : "s"} can&apos;t be imported (they&apos;ll be skipped):
          </p>
          <ul className="mt-1 max-h-40 list-inside list-disc overflow-auto text-muted-foreground">
            {problems.map((p) => (
              <li key={p.row}>
                Row {p.row}: {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">{counts.new}</span> new, <span className="font-medium">{counts.update}</span> to update,{" "}
            <span className="text-muted-foreground">{counts.same} unchanged</span>
          </p>
          <div className="max-h-80 overflow-auto rounded-[var(--radius)] border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">What happens</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Retail</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.row.sku} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          p.action === "new" && "bg-muted text-primary",
                          p.action === "update" && "bg-indigo-50 text-tertiary dark:bg-indigo-950",
                          p.action === "same" && "text-muted-foreground",
                        )}
                      >
                        {p.action === "new" ? "New" : p.action === "update" ? "Update" : "No change"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs">{p.row.sku}</td>
                    <td className="px-3 py-1.5">{p.row.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatPeso(p.row.cost)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatPeso(p.row.retail_price)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {p.row.quantity}
                      {p.action !== "new" && p.stockChange !== 0 && (
                        <span className={cn("ml-1 text-xs", p.stockChange > 0 ? "text-primary" : "text-destructive")}>
                          ({p.stockChange > 0 ? "+" : "−"}
                          {Math.abs(p.stockChange)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" onClick={runImport} disabled={pending || toImport === 0} className="w-fit">
            <Upload className="mr-1.5 size-4" aria-hidden />
            {pending ? "Importing…" : toImport === 0 ? "Nothing to import" : `Import ${toImport} part${toImport === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function FormatRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
