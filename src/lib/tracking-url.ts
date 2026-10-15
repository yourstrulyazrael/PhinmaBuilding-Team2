import { headers } from "next/headers";
import QRCode from "qrcode";

/**
 * The public tracking link for a job, e.g.
 * https://team2-omega.vercel.app/track/9f1c2a7e…
 *
 * Built from the address the technician is using right now, so it is
 * correct on the live site and on localhost without extra settings.
 * Server-only: reads the request headers.
 */
export async function trackingUrl(trackingCode: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}/track/${trackingCode}`;
}

// The QR code as an SVG picture, drawn on the server. No outside
// service ever sees the link.
export function qrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#14213d", light: "#ffffff" },
  });
}
