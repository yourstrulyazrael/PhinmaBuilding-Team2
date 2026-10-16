import { Bone, SkeletonPage, SkeletonTable } from "@/components/skeleton";

// Reports' shape while it loads (ticket 71): period picker, numbers,
// charts, table.
export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex justify-between gap-3">
        <Bone className="h-10 w-72" />
        <Bone className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
      <Bone className="h-72" />
      <SkeletonTable rows={5} />
    </SkeletonPage>
  );
}
