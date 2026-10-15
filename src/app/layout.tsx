import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenith Repair",
  description: "Track phone repairs: log jobs, hand out QR claim slips, update status in one tap.",
};

// The outer shell of every page. The technician's sidebar lives in
// (app)/layout.tsx, so public pages (sign in, tracking) stay plain.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
