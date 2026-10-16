import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, House, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * The top of every page (ticket 48), so they all line up: a breadcrumb
 * trail (ticket 68), a small label ("eyebrow") with an icon, the title,
 * a short description, and the page's main buttons on the right (under
 * the title on a phone).
 *
 * `crumbs` are the pages above this one, e.g.
 *   [{ label: "Repairs", href: "/?tab=all" }, { label: "Repair ZR-3F9A1C2B" }]
 * Overview always comes first; the last crumb is the page you're on.
 */
export function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  description,
  actions,
  crumbs,
  className,
}: {
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: Crumb[];
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && (
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              {Icon && <Icon className="size-3.5" aria-hidden />}
              {eyebrow}
            </div>
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

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Overview", href: "/" }, ...crumbs];
  return (
    <nav aria-label="Breadcrumb" className="-mb-1">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              {i > 0 && (
                <li aria-hidden className="flex">
                  <ChevronRight className="size-3.5 opacity-60" />
                </li>
              )}
              <li className="flex min-w-0">
                {c.href && !last ? (
                  <Link
                    href={c.href}
                    className="inline-flex items-center gap-1 rounded-inner px-1 py-0.5 hover:bg-muted hover:text-foreground"
                  >
                    {i === 0 && <House className="size-3.5" aria-hidden />}
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={cn("truncate px-1 py-0.5", last && "font-medium text-foreground")}>
                    {c.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
