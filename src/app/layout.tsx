import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zenith Repair",
  description: "Track phone repairs: log jobs, hand out QR claim slips, update status in one tap.",
};

// Runs before the page is drawn, so dark mode never flashes white
// first. Same rule as the Light / Dark / System switch: a saved choice
// wins, otherwise follow the device. It also picks the browser-tab icon
// to match (navy logo in dark mode). Our own fixed text, no user input.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");document.getElementById("favicon").href="/logo-dark.png"}}catch(e){}`;

// The outer shell of every page. The technician's sidebar lives in
// (app)/layout.tsx, so public pages (sign in, tracking) stay plain.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above may add "dark" to this
    // tag before React starts, which is expected.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* The tab icon. Must come before the script, which swaps it to
            the dark logo; the theme switch swaps it too
            (components/theme-switch.tsx). */}
        <link id="favicon" rel="icon" type="image/png" href="/logo-light.png" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
