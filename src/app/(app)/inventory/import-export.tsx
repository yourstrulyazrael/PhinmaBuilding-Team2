"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, FileUp, Upload } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu } from "@/components/menu";
import { Modal } from "@/components/modal";
import { cn } from "@/lib/utils";

type Format = "csv" | "xlsx" | "json";
type Plan = { row: FileRow; action: "new" | "update" | "same"; stockChange: number };

const FORMATS: { key: Format; label: string; icon: typeof FileText }[] = [
  { key: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { key: "csv", label: "CSV", icon: FileText },
  { key: "json", label: "JSON", icon: FileJson },
];

function save(rows: FileRow[], format: Format, baseName: string) {
  if (format === "csv") return download(toCsv(rows), `${baseName}.csv`, "text/csv;charset=utf-8");
  if (format === "json") return download(toJson(rows), `${baseName}.json`, "application/json");
  return downloadXlsx(rows, `${baseName}.xlsx`);
}

// "Export ▾" in the page header (owner): the inventory in the template's
// columns, so it can be edited and imported back (ticket 31).
export function ExportMenu({ current }: { current: FileRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Menu
      label="Export inventory"
      triggerClassName={buttonVariants({ variant: "secondary" })}
      trigger={
        <>
          <Download className="size-4" aria-hidden />
          Export
          <ChevronDown className="size-4" aria-hidden />
        </>
      }
      items={FORMATS.map(({ key, label, icon }) => ({
        label,
        icon,
        onSelect: () => void save(current, key, `inventory-${today}`),
      }))}
    />
  );
}

// "Import parts" in the page header (owner): templates, a file, and a
// preview before anything is saved (ticket 31).
export function ImportButton({ current }: { current: FileRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden />
        Import parts
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide
        title="Import parts"
        description="From an Excel (.xlsx), CSV or JSON file. You'll see what changes before anything is saved."
      >
        <ImportPanel current={current} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ImportPanel({ current, onDone }: { current: FileRow[]; onDone: () => void }) {
  const [fileName, setFileName] = useState<string>();
  const [plan, setPlan] = useState<Plan[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [message, setMessage] = useState<{ kind: "error" | "done"; text: string }>();
  const [pending, startTransition] = useTransition();
  const bySku = new Map(current.map((r) => [r.sku.toLowerCase(), r]));

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
            old.name === row.name && old.category === row.category && old.cost === row.cost &&
            old.retail_price === row.retail_price && old.quantity === row.quantity && old.low_stock_at === row.low_stock_at;
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
      onDone();
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
      <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-muted/60 p-4">
        <p className="text-sm font-medium">1. Download a template</p>
        <p className="text-xs text-muted-foreground">
          Columns: sku, name, category, cost, retail_price, quantity, low_stock_at. Only sku and name are required. Keep the
          first row as is.
        </p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map(({ key, label, icon: Icon }) => (
            <Button key={key} type="button" size="sm" variant="secondary" onClick={() => save(templateRows(), key, "inventory-template")}>
              <Icon className="size-4" aria-hidden />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">2. Choose your file</p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-input px-4 py-6 text-sm text-muted-foreground hover:bg-muted">
          <Upload className="size-5" aria-hidden />
          {fileName ?? "Choose a .xlsx, .csv or .json file"}
          <input
            type="file"
            accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Matching SKUs are updated, and a different quantity is recorded as a stock adjustment, so the history still adds up.
        </p>
      </div>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={cn("text-sm", message.kind === "error" ? "text-destructive" : "text-primary")}>
          {message.text}
        </p>
      )}

      {problems.length > 0 && (
        <div role="alert" className="rounded-[var(--radius)] border border-destructive/40 bg-red-50 p-3 text-sm dark:bg-red-950/40">
          <p className="font-medium text-destructive">
            {problems.length} row{problems.length === 1 ? "" : "s"} can&apos;t be imported and will be skipped:
          </p>
          <ul className="mt-1 max-h-32 list-inside list-disc overflow-auto text-muted-foreground">
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
          <p className="text-sm font-medium">
            3. Check and import: {counts.new} new, {counts.update} to update,{" "}
            <span className="font-normal text-muted-foreground">{counts.same} unchanged</span>
          </p>
          <div className="max-h-72 overflow-auto rounded-[var(--radius)] border border-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Change</th>
                  <th className="px-3 py-2 font-medium">Part</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Retail</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
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
                    <td className="px-3 py-1.5">
                      {p.row.name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{p.row.sku}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.row.category}</td>
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
          <div className="flex justify-end">
            <Button type="button" onClick={runImport} disabled={pending || toImport === 0}>
              <Upload className="size-4" aria-hidden />
              {pending ? "Importing…" : toImport === 0 ? "Nothing to import" : `Import ${toImport} part${toImport === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
