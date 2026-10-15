"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
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
 * Light / Dark / System. The choice is remembered on this device only
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

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex rounded-full border border-border bg-background p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-colors",
            theme === value ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
