"use client";

import type { TrendPoint } from "@/lib/workspace";
import { LineChart } from "./line-chart";

// "₱1,500" in tooltips; "₱1.5K" on the axis, to keep it narrow.
const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const pesoShort = (n: number) =>
  n >= 1000
    ? `₱${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n / 1000)}K`
    : `₱${Math.round(n)}`;

/**
 * The two trend charts under the statistics (ticket 26): repairs
 * received vs picked up, and money earned. Two charts, not one, because
 * counts and pesos can't honestly share an axis.
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

function EarnedChart({ labels, axisName, values }: { labels: string[]; axisName: string; values: number[] }) {
  return (
    <LineChart
      title="Earned (₱)"
      axisName={axisName}
      labels={labels}
      series={[{ name: "Earned", color: "var(--chart-2)", values }]}
      format={peso}
      tickFormat={pesoShort}
    />
  );
}
