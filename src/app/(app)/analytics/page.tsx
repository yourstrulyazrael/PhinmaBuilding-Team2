import { redirect } from "next/navigation";

// Analytics joined Reports on one page (ticket 33). Old links and
// bookmarks land there, keeping the chosen period.
export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const { period } = await searchParams;
  redirect(typeof period === "string" ? `/reports?period=${encodeURIComponent(period)}` : "/reports");
}
