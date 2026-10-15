import { redirect } from "next/navigation";

// Reports moved to its own page in the top bar (ticket 26). Old links
// and bookmarks land there instead.
export default async function OldReportPage({ searchParams }: PageProps<"/workspace/report">) {
  const { month } = await searchParams;
  redirect(typeof month === "string" ? `/reports?period=${encodeURIComponent(month)}` : "/reports");
}
