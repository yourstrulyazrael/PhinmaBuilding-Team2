"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

export type SlipImageData = {
  shopName: string;
  shopContact: string;
  shopAddress: string; // "" when the shop has none
  note: string; // the owner's slip note (ticket 34); "" for none
  rows: [label: string, value: string][];
  url: string;
  fileName: string;
};

// Same colours as the app (see globals.css).
const NAVY = "#14213d";
const GREY = "#5b6478";
const BORDER = "#dfe6e1";

const WIDTH = 400; // in CSS pixels; drawn at 3x so it stays sharp
const SCALE = 3;
const PAD = 28;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * Draws the claim slip onto a canvas (a blank picture the browser can
 * draw on) and downloads it as a PNG. It all happens on the phone: no
 * outside service sees the slip.
 */
export function SaveImageButton({ slip }: { slip: SlipImageData }) {
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const blob = await drawSlip(slip);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = slip.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={save} disabled={busy}>
      <ImageDown className="mr-1.5 size-4" aria-hidden />
      {busy ? "Saving…" : "Save as image"}
    </Button>
  );
}

async function drawSlip(slip: SlipImageData): Promise<Blob> {
  // The QR is drawn big and with a white border so phone cameras read it easily.
  const qrSize = 240;
  const qr = await loadImage(
    await QRCode.toDataURL(slip.url, {
      margin: 2,
      width: qrSize * SCALE,
      errorCorrectionLevel: "M",
      color: { dark: NAVY, light: "#ffffff" },
    }),
  );
  const logo = await loadImage("/logo-light.png");

  // Measure first on a scratch canvas, so we know how tall the slip is.
  const scratch = document.createElement("canvas").getContext("2d")!;
  const labelWidth = 120;
  const valueWidth = WIDTH - PAD * 2 - labelWidth;
  scratch.font = `15px ${FONT}`;
  const rows = slip.rows.map(([label, value]) => ({
    label,
    lines: wrap(scratch, value, valueWidth),
  }));
  scratch.font = `11px ${FONT}`;
  const urlLines = wrap(scratch, slip.url, WIDTH - PAD * 2, true);
  scratch.font = `12px ${FONT}`;
  const addressLines = slip.shopAddress ? wrap(scratch, slip.shopAddress, WIDTH - PAD * 2 - 48 - 80) : [];
  const noteLines = slip.note ? slip.note.split("\n").flatMap((p) => wrap(scratch, p, WIDTH - PAD * 2)) : [];

  const headerHeight = 76 + addressLines.length * 16;
  const rowsHeight = rows.reduce((h, r) => h + r.lines.length * 21 + 8, 0);
  const qrBlock = 24 + qrSize + 34 + urlLines.length * 15;
  const noteBlock = noteLines.length ? 20 + 16 + noteLines.length * 16 : 0;
  const height = PAD + headerHeight + 16 + rowsHeight + 8 + qrBlock + noteBlock + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "top";

  // Header: shop name and contact, "CLAIM SLIP" on the right.
  let y = PAD;
  // Always the green logo: a slip looks the same whatever theme the
  // phone is in.
  ctx.drawImage(logo, PAD, y, 36, 36);
  ctx.fillStyle = NAVY;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText(slip.shopName, PAD + 48, y, WIDTH - PAD * 2 - 150);
  ctx.fillStyle = GREY;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(slip.shopContact, PAD + 48, y + 21);
  addressLines.forEach((line, i) => ctx.fillText(line, PAD + 48, y + 37 + i * 16));
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("CLAIM SLIP", WIDTH - PAD, y + 4);
  ctx.textAlign = "left";
  y += headerHeight - 16;
  dashedLine(ctx, y);
  y += 16;

  // Details: label on the left, value on the right.
  for (const row of rows) {
    ctx.fillStyle = GREY;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(row.label, PAD, y + 1);
    ctx.fillStyle = NAVY;
    ctx.font = `15px ${FONT}`;
    row.lines.forEach((line, i) => ctx.fillText(line, PAD + labelWidth, y + i * 21));
    y += row.lines.length * 21 + 8;
  }
  y += 8;
  dashedLine(ctx, y);
  y += 24;

  // The QR code and the link underneath it.
  ctx.drawImage(qr, (WIDTH - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + 10;
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY;
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText("Scan to check your repair status", WIDTH / 2, y);
  y += 24;
  ctx.fillStyle = GREY;
  ctx.font = `11px ${FONT}`;
  urlLines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, y + i * 15));
  ctx.textAlign = "left";

  // The owner's note (ticket 34), under a last dashed line.
  if (noteLines.length) {
    y += urlLines.length * 15 + 20;
    dashedLine(ctx, y);
    y += 16;
    ctx.fillStyle = GREY;
    ctx.font = `12px ${FONT}`;
    noteLines.forEach((line, i) => ctx.fillText(line, PAD, y + i * 16));
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make image"))), "image/png"),
  );
}

function dashedLine(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = BORDER;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(WIDTH - PAD, y);
  ctx.stroke();
  ctx.restore();
}

// Splits text into lines that fit the width. Links have no spaces, so
// they are split letter by letter instead of word by word.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, byChar = false) {
  const parts = byChar ? [...text] : text.split(" ");
  const joiner = byChar ? "" : " ";
  const lines: string[] = [];
  let line = "";
  for (const part of parts) {
    const next = line ? line + joiner + part : part;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = part;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
