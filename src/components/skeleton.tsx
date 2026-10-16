import { cn } from "@/lib/utils";

/**
 * Loading placeholders (ticket 71): soft grey shapes in the layout of the
 * page that's on its way, so a click responds at once and nothing jumps
 * when the real content arrives. They shimmer gently; with "reduce
 * motion" they stay still.
 */
export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius)] bg-muted motion-reduce:animate-none", className)} />;
}

// The page box every skeleton sits in; announces "Loading" once.
export function SkeletonPage({ wide = true, children }: { wide?: boolean; children: React.ReactNode }) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-4 py-6 md:px-8 md:py-10",
        wide ? "max-w-[120rem] 2xl:px-12" : "max-w-4xl",
      )}
    >
      {children}
    </main>
  );
}

// Breadcrumbs, eyebrow, title, description (the PageHeader shape).
export function SkeletonHeader({ actions = 0 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2.5">
        <Bone className="h-3.5 w-40" />
        <Bone className="h-6 w-28 rounded-full" />
        <Bone className="h-8 w-72 max-w-full" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Bone key={i} className="h-10 w-32" />
          ))}
        </div>
      )}
    </div>
  );
}

// A card holding a table or list: a title and some rows.
export function SkeletonTable({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-card", className)}>
      <Bone className="h-5 w-40" />
      <Bone className="h-10 w-full" />
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Bone className="size-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Bone className="h-4 w-2/5" />
              <Bone className="h-3 w-3/5" />
            </div>
            <Bone className="hidden h-8 w-28 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A card with a title and a few lines of fields.
export function SkeletonCard({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-[var(--radius)] border border-border/70 bg-card p-6 shadow-card", className)}>
      <Bone className="h-5 w-36" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className={cn("h-4", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}
