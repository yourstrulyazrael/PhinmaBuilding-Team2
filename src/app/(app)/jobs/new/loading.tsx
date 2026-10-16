import { Bone, SkeletonHeader, SkeletonPage } from "@/components/skeleton";

// The New repair form's shape while it loads (ticket 71).
export default function Loading() {
  return (
    <SkeletonPage wide={false}>
      <SkeletonHeader />
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border/70 bg-card p-6 shadow-card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-4 w-32" />
            <Bone className={i === 3 ? "h-24" : "h-10"} />
          </div>
        ))}
        <Bone className="h-10 w-36 self-end" />
      </div>
    </SkeletonPage>
  );
}
