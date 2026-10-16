import { Bone, SkeletonCard, SkeletonHeader, SkeletonPage } from "@/components/skeleton";

// A repair's shape while it loads (ticket 71): header, status with its
// stepper, details, the update form.
export default function Loading() {
  return (
    <SkeletonPage wide={false}>
      <SkeletonHeader actions={2} />
      <div className="flex flex-col gap-5 rounded-[var(--radius)] border border-border/70 bg-card p-6 shadow-card">
        <Bone className="h-5 w-20" />
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
      <SkeletonCard lines={7} />
      <SkeletonCard lines={5} />
    </SkeletonPage>
  );
}
