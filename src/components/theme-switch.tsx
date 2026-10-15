"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { RevealLabel, revealItem } from "@/components/reveal-label";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

// Puts the "dark" class on <html> (or takes it off). The same rule runs
// before the page appears, in the script in app/layout.tsx.
function apply(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
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
 * Light / Dark / System, as one button that cycles through them. The
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
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Private browsing can block storage: the switch still works for this visit.
    }
  }

  // One button that steps Light → Dark → System, showing the current
  // choice's icon; its name slides out on hover like the other top-bar
  // buttons.
  const index = OPTIONS.findIndex((o) => o.value === theme);
  const { label, icon: Icon } = OPTIONS[index];
  const next = OPTIONS[(index + 1) % OPTIONS.length];

  return (
    <button
      type="button"
      onClick={() => choose(next.value)}
      aria-label={`Theme: ${label}. Switch to ${next.label}`}
      className={cn(revealItem, "text-muted-foreground hover:bg-muted hover:text-foreground", className)}
    >
      <Icon className="size-4 shrink-0 md:size-5" aria-hidden />
      <RevealLabel>Theme: {label}</RevealLabel>
    </button>
  );
}
