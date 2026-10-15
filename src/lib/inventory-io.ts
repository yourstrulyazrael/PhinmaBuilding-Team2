/**
 * Reading and writing inventory files (ticket 31): CSV, JSON and Excel
 * all become the same rows, checked the same way. Runs in the browser:
 * files never leave the device until the owner presses Import.
 */

export const COLUMNS = ["sku", "name", "category", "cost", "retail_price", "quantity", "low_stock_at"] as const;
export type Column = (typeof COLUMNS)[number];

export type FileRow = {
  sku: string;
  name: string;
  category: string;
  cost: number;
  retail_price: number;
  quantity: number;
  low_stock_at: number;
};

export type Problem = { row: number; reason: string };

// Headings people are likely to use, mapped to our columns.
const ALIASES: Record<string, Column> = {
  sku: "sku", code: "sku", "part code": "sku", "item code": "sku",
  name: "name", part: "name", "part name": "name", description: "name", item: "name",
  category: "category", type: "category", group: "category", "part type": "category",
  cost: "cost", "cost price": "cost", "unit cost": "cost", "buying price": "cost",
  retail_price: "retail_price", "retail price": "retail_price", retail: "retail_price", price: "retail_price",
  "selling price": "retail_price", srp: "retail_price",
  quantity: "quantity", qty: "quantity", stock: "quantity", "in stock": "quantity", count: "quantity",
  low_stock_at: "low_stock_at", "low stock at": "low_stock_at", "low stock": "low_stock_at",
  "low-stock level": "low_stock_at", "low stock level": "low_stock_at", "reorder level": "low_stock_at",
};

const EXAMPLES: FileRow[] = [
  { sku: "LCD-IP12", name: "iPhone 12 LCD screen", category: "Screens", cost: 2500, retail_price: 3800, quantity: 4, low_stock_at: 2 },
  { sku: "BAT-A52", name: "Galaxy A52 battery", category: "Batteries", cost: 650, retail_price: 1100, quantity: 10, low_stock_at: 3 },
];

// "₱1,200.50" -> 1200.5; "" -> NaN.
function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[₱,\s]/g, "").replace(/^php/i, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

/**
 * A table (first row = headings) -> checked rows, plus problems with
 * their row number as the owner sees it in their file (headings = row 1).
 * `lowStockDefault` fills a missing low-stock column.
 */
export function rowsFromTable(table: unknown[][]): { rows: FileRow[]; problems: Problem[] } {
  const problems: Problem[] = [];
  if (table.length === 0) return { rows: [], problems: [{ row: 1, reason: "The file is empty." }] };

  const headings = table[0].map((h) => ALIASES[String(h ?? "").trim().toLowerCase()]);
  const missing = (["sku", "name"] as Column[]).filter((c) => !headings.includes(c));
  if (missing.length > 0) {
    return {
      rows: [],
      problems: [{ row: 1, reason: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Use the template's headings.` }],
    };
  }

  const rows: FileRow[] = [];
  const seen = new Map<string, number>();
  table.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2;
    if (cells.every((c) => String(c ?? "").trim() === "")) return; // blank line
    // More values than headings usually means a comma inside a number
    // (2,500) in a hand-made CSV, which shifts every column after it.
    // Refuse it rather than import shifted numbers.
    if (cells.slice(table[0].length).some((c) => String(c ?? "").trim() !== "")) {
      problems.push({
        row: rowNumber,
        reason: 'More values than headings: check for a comma inside a number (write 2500, or "2,500" in quotes).',
      });
      return;
    }
    const get = (col: Column) => cells[headings.indexOf(col)];
    const has = (col: Column) => headings.includes(col) && String(get(col) ?? "").trim() !== "";

    const row: FileRow = {
      sku: String(get("sku") ?? "").trim(),
      name: String(get("name") ?? "").trim(),
      category: has("category") ? String(get("category")).trim() : "",
      cost: has("cost") ? toNumber(get("cost")) : 0,
      retail_price: has("retail_price") ? toNumber(get("retail_price")) : 0,
      quantity: has("quantity") ? toNumber(get("quantity")) : 0,
      low_stock_at: has("low_stock_at") ? toNumber(get("low_stock_at")) : 2,
    };

    const reason =
      !row.sku ? "No SKU." :
      row.sku.length > 40 ? "SKU is longer than 40 characters." :
      !row.name ? "No name." :
      row.name.length > 100 ? "Name is longer than 100 characters." :
      row.category.length > 50 ? "Category is longer than 50 characters." :
      !(Number.isFinite(row.cost) && row.cost >= 0 && row.cost <= 99_999_999.99) ? "Cost must be ₱0 or more." :
      !(Number.isFinite(row.retail_price) && row.retail_price >= 0 && row.retail_price <= 99_999_999.99) ? "Retail price must be ₱0 or more." :
      !(Number.isInteger(row.quantity) && row.quantity >= 0 && row.quantity <= 9999) ? "Quantity must be a whole number from 0 to 9,999." :
      !(Number.isInteger(row.low_stock_at) && row.low_stock_at >= 0 && row.low_stock_at <= 9999) ? "Low-stock level must be a whole number, 0 or more." :
      seen.has(row.sku.toLowerCase()) ? `Same SKU as row ${seen.get(row.sku.toLowerCase())}.` :
      null;

    if (reason) problems.push({ row: rowNumber, reason });
    else {
      seen.set(row.sku.toLowerCase(), rowNumber);
      rows.push({ ...row, cost: round2(row.cost), retail_price: round2(row.retail_price) });
    }
  });
  return { rows, problems };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// A CSV file -> a table. Handles quotes, commas and line breaks inside
// quotes, and Excel's "UTF-8 with BOM".
export function parseCsv(text: string): string[][] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); table.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); table.push(row); }
  return table;
}

// A JSON file -> a table. Accepts a list of parts, or { "parts": [...] }.
export function parseJson(text: string): unknown[][] {
  const data = JSON.parse(text);
  const list: unknown = Array.isArray(data) ? data : data?.parts;
  if (!Array.isArray(list)) throw new Error("Expected a list of parts.");
  const keys = [...new Set(list.flatMap((item) => (item && typeof item === "object" ? Object.keys(item) : [])))];
  return [keys, ...list.map((item) => keys.map((k) => (item as Record<string, unknown>)?.[k]))];
}

// --- Writing ---------------------------------------------------------

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: FileRow[]) {
  // The BOM makes Excel read ₱ and accents correctly.
  return "﻿" + [COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\r\n") + "\r\n";
}

export function toJson(rows: FileRow[]) {
  return JSON.stringify(rows, null, 2) + "\n";
}

export const templateRows = () => EXAMPLES;

// Saves text as a file on the device.
export function download(content: BlobPart, fileName: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

// An Excel workbook with one "Inventory" sheet in the template's columns.
export async function downloadXlsx(rows: FileRow[], fileName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const bold = (value: string) => ({ value, fontWeight: "bold" as const });
  const peso = (value: number) => ({ value, format: '"₱"#,##0.00' });
  await writeXlsxFile([
    {
      sheet: "Inventory",
      data: [
        COLUMNS.map(bold),
        ...rows.map((r) => [r.sku, r.name, r.category, peso(r.cost), peso(r.retail_price), r.quantity, r.low_stock_at]),
      ],
      columns: [16, 32, 16, 12, 14, 10, 14].map((width) => ({ width })),
    },
  ] as Parameters<typeof writeXlsxFile>[0]).toFile(fileName);
}

// Any of the three file types -> a table.
export async function readFile(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  if (name.endsWith(".xls")) throw new Error("Old .xls files aren't supported. In Excel, use Save As → .xlsx (or CSV).");
  const text = await file.text();
  if (name.endsWith(".json")) return parseJson(text);
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(text);
  throw new Error("Choose a .csv, .xlsx or .json file.");
}
