"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type LineSeries = {
  name: string;
  color: string; // a CSS colour, e.g. "var(--chart-1)" (see globals.css)
  values: number[];
};

const HEIGHT = 200; // plot area
const AXIS = 24; // x-axis labels underneath
const LEFT = 44; // y-axis labels
const RIGHT = 12;
const TOP = 12;

/**
 * A smooth line chart drawn in plain SVG (ticket 26).
 *
 * - Smooth but honest: the curve never bends above or below the real
 *   values, so it can't invent a peak or a dip.
 * - Hover (or focus and use ← →) snaps a crosshair to the nearest point
 *   and shows every line's value there.
 * - Two or more lines get a legend; every value is also in the table
 *   view underneath, so nothing is hover-only.
 */
export function LineChart({
  title,
  labels,
  series,
  axisName,
  wholeNumbers = false,
  format = (n) => String(n),
  tickFormat = format,
}: {
  title: string;
  labels: string[];
  series: LineSeries[];
  axisName: string; // "Hour" or "Day": the table's first column
  wholeNumbers?: boolean; // counts: y-axis ticks stay whole numbers
  format?: (n: number) => string; // tooltip and table
  tickFormat?: (n: number) => string; // y-axis (shorter), if different
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);
  const id = useId();

  // Redraw at the card's real width, so text stays crisp at any size.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = labels.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)), wholeNumbers);
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const plotWidth = width - LEFT - RIGHT;
  const x = (i: number) => LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const y = (v: number) => TOP + HEIGHT - (max === 0 ? 0 : (v / max) * HEIGHT);

  // About six x labels, evenly spread, always including the last one.
  const every = Math.max(1, Math.ceil(n / 6));
  const shownLabels = labels.map((_, i) => i).filter((i) => i % every === 0 || i === n - 1);

  function pointAt(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = n <= 1 ? 0 : Math.round(((px - LEFT) / plotWidth) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + step)));
    }
    if (e.key === "Escape") setActive(null);
  }

  const tipLeft = active === null ? 0 : (x(active) / width) * 100;

  return (
    <figure className="flex flex-col gap-3" aria-labelledby={`${id}-title`}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${id}-title`} className="text-sm font-semibold text-tertiary">
          {title}
        </span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {series.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div ref={box} className="relative w-full">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${HEIGHT + TOP + AXIS}`}
          role="img"
          aria-label={`${title}. Use the left and right arrow keys to read each point.`}
          tabIndex={0}
          onPointerMove={pointAt}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((i) => i ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="block touch-pan-y overflow-visible rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Hairline grid and y-axis values. */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text
                x={LEFT - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {tickFormat(t)}
              </text>
            </g>
          ))}

          {/* x-axis labels */}
          {shownLabels.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={TOP + HEIGHT + 16}
              textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
              className="fill-muted-foreground text-[11px]"
            >
              {labels[i]}
            </text>
          ))}

          {/* A faint wash under a single line; none when lines overlap. */}
          {series.length === 1 && n > 1 && (
            <path
              d={`${smoothPath(series[0].values.map((v, i) => [x(i), y(v)]))} L ${x(n - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
              fill={series[0].color}
              opacity={0.1}
            />
          )}

          {series.map((s) => (
            <path
              key={s.name}
              d={smoothPath(s.values.map((v, i) => [x(i), y(v)]))}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Crosshair, and a dot on every line at that point. Without a
              hover, the dot marks the latest value. */}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={TOP} y2={TOP + HEIGHT} stroke="var(--muted-foreground)" strokeWidth={1} />
          )}
          {series.map((s) => {
            const i = active ?? n - 1;
            if (n === 0) return null;
            return (
              <circle
                key={s.name}
                cx={x(i)}
                cy={y(s.values[i] ?? 0)}
                r={4}
                fill={s.color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {/* The tooltip: values first, then which line. */}
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 min-w-32 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${tipLeft}%`,
              transform: `translateX(${tipLeft > 60 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            <p className="mb-1 text-muted-foreground">{labels[active]}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-2">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold text-foreground">{format(s.values[active] ?? 0)}</span>
                <span className="text-muted-foreground">{s.name}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Every value without hovering: the chart's table twin. */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">{axisName}</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 pr-3 text-right font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-1 pr-3">{label}</td>
                  {series.map((s) => (
                    <td key={s.name} className="py-1 pr-3 text-right tabular-nums">
                      {format(s.values[i] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

// A clean axis top that splits into 4 even steps: 3 → 4, 13 → 20,
// 2,340 → 2,400. With wholeNumbers, every step is a whole number.
function niceMax(value: number, wholeNumbers: boolean) {
  if (value <= 0) return 4;
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const factor of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]) {
    const step = factor * magnitude;
    if (wholeNumbers && !Number.isInteger(step)) continue;
    if (step >= raw) return step * 4;
  }
  return 10 * magnitude * 4;
}

/**
 * A smooth path through the points that never overshoots them
 * ("monotone cubic": Fritsch–Carlson). Between two equal values it stays
 * flat, and it never curves below zero or above a peak.
 */
function smoothPath(points: [number, number][]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  const n = points.length;
  const dx = points.slice(1).map((p, i) => p[0] - points[i][0]);
  const slope = points.slice(1).map((p, i) => (p[1] - points[i][1]) / dx[i]);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  // Rein in tangents that would make the curve overshoot.
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const third = dx[i] / 3;
    d += ` C ${x0 + third} ${y0 + tangent[i] * third}, ${x1 - third} ${y1 - tangent[i + 1] * third}, ${x1} ${y1}`;
  }
  return d;
}
