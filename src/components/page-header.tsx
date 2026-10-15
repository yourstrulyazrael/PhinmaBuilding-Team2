import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The top of every page (ticket 48), so they all line up: an optional
 * back link, a small label ("eyebrow") with an icon, the title, a short
 * description, and the page's main buttons on the right (under the title
 * on a phone).
 */
export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
  back,
  className,
}: {
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {back && (
        <Link href={back.href} className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit text-muted-foreground" })}>
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && (
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              {Icon && <Icon className="size-3.5" aria-hidden />}
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-tertiary md:text-[2rem] md:leading-tight">
            {title}
          </h1>
          {description && <div className="max-w-3xl text-sm text-muted-foreground md:text-[0.95rem]">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
