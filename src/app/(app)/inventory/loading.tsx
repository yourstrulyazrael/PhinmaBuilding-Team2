import { SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/skeleton";

// This page's shape while it loads (ticket 71): header, then its list.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader actions={1} />
      <SkeletonTable rows={8} />
    </SkeletonPage>
  );
}
