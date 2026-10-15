"use client";

import { useMoney } from "@/components/currency";
import type { TrendPoint } from "@/lib/workspace";
import { LineChart } from "./line-chart";

/**
 * The two trend charts under the statistics (ticket 26): repairs
 * received vs picked up, and money earned. Two charts, not one, because
 * counts and money can't honestly share an axis.
 */
export function TrendCharts({ points, bucket }: { points: TrendPoint[]; bucket: "hour" | "day" }) {
  const labels = points.map((p) => p.label);
  const axisName = bucket === "hour" ? "Hour" : "Day";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LineChart
        title="Repairs"
        axisName={axisName}
        labels={labels}
        wholeNumbers
        series={[
          { name: "Received", color: "var(--chart-1)", values: points.map((p) => p.received) },
          { name: "Picked up", color: "var(--chart-2)", values: points.map((p) => p.pickedUp) },
        ]}
      />
      <EarnedChart labels={labels} axisName={axisName} values={points.map((p) => p.earned)} />
    </div>
  );
}

// Money in the shop's currency (ticket 54): "$1,500" in tooltips, and
// "$1.5K" on the axis to keep it narrow.
function EarnedChart({ labels, axisName, values }: { labels: string[]; axisName: string; values: number[] }) {
  const { money, symbol } = useMoney();
  const short = (n: number) =>
    n >= 1000 ? `${symbol}${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n / 1000)}K` : `${symbol}${Math.round(n)}`;
  return (
    <LineChart
      title={`Earned (${symbol})`}
      axisName={axisName}
      labels={labels}
      series={[{ name: "Earned", color: "var(--chart-2)", values }]}
      format={(n) => money(Math.round(n))}
      tickFormat={short}
    />
  );
}
