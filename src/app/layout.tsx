import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// The interface font (ticket 48). next/font downloads it once at build
// time and serves it from our own site: no request to Google from the
// browser. Falls back to the system font while it loads.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Zenith Repair",
  description: "Track phone repairs: log jobs, hand out QR claim slips, update status in one tap.",
};

// Runs before the page is drawn, so dark mode never flashes white
// first. Same rule as the Light / Dark / System switch: a saved choice
// wins, otherwise follow the device. Our own fixed text, no user input.
//
// It also owns the browser-tab icon: green logo in light mode, navy in
// dark. The icon tag is made HERE, not by React, because React redraws
// the page (e.g. the bell's refresh every 30 seconds) and would put its
// own light-logo tag back. It watches the "dark" class on <html>, so the
// theme switch, or the device changing to dark at sunset, swaps it on
// every page. Each swap is a brand-new tag: some browsers ignore an
// icon whose address is changed in place.
const THEME_SCRIPT = `(function(){
function dark(){var t;try{t=localStorage.getItem("theme")}catch(e){}return t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)}
function icon(d){var h=d?"/logo-dark.png":"/logo-light.png",o=document.getElementById("favicon");if(o&&o.getAttribute("href")===h)return;var l=document.createElement("link");l.id="favicon";l.rel="icon";l.type="image/png";l.href=h;if(o)o.remove();document.head.appendChild(l)}
var d=dark();document.documentElement.classList.toggle("dark",d);icon(d);
new MutationObserver(function(){icon(document.documentElement.classList.contains("dark"))}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){document.documentElement.classList.toggle("dark",dark())});
})()`;

// The outer shell of every page. The technician's sidebar lives in
// (app)/layout.tsx, so public pages (sign in, tracking) stay plain.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above may add "dark" to this
    // tag before React starts, which is expected.
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Also adds the tab icon (see above). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
