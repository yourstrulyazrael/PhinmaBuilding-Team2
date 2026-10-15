/**
 * Shown the instant a page in the app is clicked, while its data loads
 * (Next.js shows this file automatically). The top bar stays put; this
 * fills the page area with soft placeholder shapes, so a click always
 * responds straight away.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-4 py-6 md:px-8 md:py-10 2xl:px-12"
    >
      <div className="flex flex-col gap-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
      <Bone className="h-96" />
    </main>
  );
}

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[var(--radius)] bg-muted motion-reduce:animate-none ${className}`} />;
}
