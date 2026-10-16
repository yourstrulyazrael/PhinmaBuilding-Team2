import { Bone, SkeletonCard, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/skeleton";

// The Overview's shape while it loads (ticket 71). Next.js shows a
// folder's loading.tsx the instant a link is clicked; pages without their
// own use this one.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader actions={3} />
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-24 md:h-32" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-28" />
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <SkeletonTable rows={6} />
        <SkeletonCard lines={6} />
      </div>
    </SkeletonPage>
  );
}
