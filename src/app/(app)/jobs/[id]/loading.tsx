import { Bone, SkeletonCard, SkeletonHeader } from "@/components/skeleton";

// A repair's shape while it loads (ticket 71): header, then the work on
// the left (progress with its stepper, the update) and the facts on the
// right (customer, price, details).
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-8 md:py-10">
      <SkeletonHeader actions={2} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 rounded-[var(--radius)] border border-border/70 bg-card p-6 shadow-card">
            <Bone className="h-5 w-28" />
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <Bone className="size-7 rounded-full" />
                  <Bone className="h-3 w-14" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Bone key={i} className="h-11" />
              ))}
            </div>
          </div>
          <SkeletonCard lines={6} />
        </div>
        <div className="flex flex-col gap-5">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    </main>
  );
}
