"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { Menu } from "@/components/menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

// Puts the "dark" class on <html> (or takes it off). The same rule runs
// before the page appears, in the script in app/layout.tsx, which also
// keeps the tab icon matching this class.
function apply(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  // The tab icon follows this class by itself (the script in app/layout.tsx).
}

function readSaved(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/**
 * Light / Dark / System, as a dropdown (ticket 65). The
 * choice is remembered on this device only
 * (in the browser's localStorage); System follows the phone or laptop
 * setting, and keeps following it if that changes.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  // Starts as "system" on the server; the real choice is read after the
  // page loads, so the server and browser agree on the first render.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // Read the saved choice once the page is in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readSaved());
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => apply("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  function choose(next: Theme) {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Private browsing can block storage: the switch still works for this visit.
    }
    const swap = () => {
      apply(next);
      setTheme(next);
    };
    // A soft cross-fade from the old colours to the new (ticket 65): the
    // browser snapshots the page, swaps the theme, and fades between the
    // two (timing in globals.css). Without support, or with "reduce
    // motion", it simply switches.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("startViewTransition" in document && !reduce) document.startViewTransition(swap);
    else swap();
  }

  // A dropdown (ticket 65): Light, Dark, System, with a ✓ on the current
  // one. The button shows the current choice's icon, and its name in a
  // tooltip like the other top-bar buttons.
  const { label, icon: Icon } = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];

  return (
    <Menu
      label={`Theme: ${label}. Change theme`}
      align="end"
      triggerClassName={cn(revealItem, "text-muted-foreground hover:bg-muted hover:text-foreground", className)}
      trigger={
        <>
          <Icon className="size-[18px] shrink-0 md:size-5" aria-hidden />
          <RevealLabel>Theme: {label}</RevealLabel>
        </>
      }
      items={OPTIONS.map((o) => ({
        label: o.label,
        icon: o.icon,
        checked: o.value === theme,
        onSelect: () => choose(o.value),
      }))}
    />
  );
}
