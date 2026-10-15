import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Zenith Repair logo: the green version in light mode, the navy one
 * in dark mode. Both are in /public. `alwaysLight` keeps the green one,
 * for the claim slip, which should look the same on every phone.
 */
export function LogoMark({ size = 36, alwaysLight = false, className }: { size?: number; alwaysLight?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Image
        src="/logo-light.png"
        alt="Zenith Repair"
        width={size}
        height={size}
        className={cn(!alwaysLight && "dark:hidden")}
      />
      {!alwaysLight && (
        <Image src="/logo-dark.png" alt="" aria-hidden width={size} height={size} className="hidden dark:block" />
      )}
    </span>
  );
}

// The logo with a name next to it: the app name, or a shop's name.
export function Logo({
  name = "Zenith Repair",
  size = 36,
  alwaysLight = false,
  className,
  nameClassName,
}: {
  name?: string;
  size?: number;
  alwaysLight?: boolean;
  className?: string;
  nameClassName?: string; // e.g. hide the name on narrow phones
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} alwaysLight={alwaysLight} />
      <span className={cn("text-lg font-semibold tracking-tight text-tertiary", nameClassName)}>{name}</span>
    </span>
  );
}
