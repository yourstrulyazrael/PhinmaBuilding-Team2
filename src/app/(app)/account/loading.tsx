import { SkeletonCard, SkeletonHeader, SkeletonPage } from "@/components/skeleton";

// Account's shape while it loads (ticket 71): a column of forms.
export default function Loading() {
  return (
    <SkeletonPage wide={false}>
      <SkeletonHeader />
      <SkeletonCard lines={5} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
    </SkeletonPage>
  );
}
