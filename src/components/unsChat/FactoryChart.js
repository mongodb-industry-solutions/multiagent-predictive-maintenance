"use client";

const COLORS = ["#00684A", "#016BF8", "#DB6C00", "#7C3AED"];
const WIDTH = 620;
const HEIGHT = 250;
const PAD = { top: 18, right: 18, bottom: 50, left: 48 };

function allPoints(series) {
  return series.flatMap((entry) => entry.data || []);
}

function formatValue(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function DonutChart({ chart }) {
  const points = chart.series[0]?.data || [];
  const total = points.reduce((sum, point) => sum + Math.max(point.value, 0), 0);
  let cursor = 0;
  const stops = points.map((point, index) => {
    const start = cursor;
    cursor += total ? (Math.max(point.value, 0) / total) * 360 : 0;
    return `${COLORS[index % COLORS.length]} ${start}deg ${cursor}deg`;
  });

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-40 w-40">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: total
              ? `conic-gradient(${stops.join(", ")})`
              : "#E8EDEB",
          }}
        />
        <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white text-center">
          <span>
            <span className="block text-2xl font-semibold text-[#112733]">
              {formatValue(total)}
            </span>
            <span className="text-xs text-[#5C6C75]">
              {chart.unit || "total"}
            </span>
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        {points.map((point, index) => (
          <div
            key={`${point.label}-${index}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-[#3D4F58]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{point.label}</span>
            </span>
            <span className="font-medium text-[#112733]">
              {formatValue(point.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartesianChart({ chart }) {
  const points = allPoints(chart.series);
  const labels = chart.series[0]?.data?.map((point) => point.label) || [];
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const xFor = (index) =>
    PAD.left +
    (labels.length <= 1 ? innerWidth / 2 : (index / (labels.length - 1)) * innerWidth);
  const yFor = (value) =>
    PAD.top + innerHeight - (Math.max(value, 0) / maxValue) * innerHeight;
  const barGroupWidth = innerWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(
    34,
    (barGroupWidth * 0.72) / Math.max(chart.series.length, 1)
  );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="min-w-[560px] w-full"
        role="img"
        aria-label={`${chart.title} ${chart.type} chart`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + innerHeight * ratio;
          const value = maxValue * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={PAD.left}
                y1={y}
                x2={WIDTH - PAD.right}
                y2={y}
                stroke="#D8E3DF"
                strokeDasharray={ratio === 1 ? undefined : "4 4"}
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#5C6C75"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {chart.type === "line"
          ? chart.series.map((entry, seriesIndex) => {
              const linePoints = (entry.data || [])
                .map(
                  (point, index) =>
                    `${xFor(index)},${yFor(Number(point.value) || 0)}`
                )
                .join(" ");
              return (
                <g key={entry.name}>
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke={COLORS[seriesIndex % COLORS.length]}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {(entry.data || []).map((point, index) => (
                    <circle
                      key={`${point.label}-${index}`}
                      cx={xFor(index)}
                      cy={yFor(Number(point.value) || 0)}
                      r="4"
                      fill="white"
                      stroke={COLORS[seriesIndex % COLORS.length]}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              );
            })
          : chart.series.flatMap((entry, seriesIndex) =>
              (entry.data || []).map((point, index) => {
                const height =
                  (Math.max(Number(point.value) || 0, 0) / maxValue) *
                  innerHeight;
                const groupStart =
                  PAD.left + index * barGroupWidth + barGroupWidth * 0.14;
                return (
                  <rect
                    key={`${entry.name}-${point.label}-${index}`}
                    x={groupStart + seriesIndex * barWidth}
                    y={PAD.top + innerHeight - height}
                    width={barWidth}
                    height={height}
                    rx="4"
                    fill={COLORS[seriesIndex % COLORS.length]}
                  />
                );
              })
            )}

        {labels.map((label, index) => {
          const x =
            chart.type === "bar"
              ? PAD.left + index * barGroupWidth + barGroupWidth / 2
              : xFor(index);
          const showEvery = Math.max(1, Math.ceil(labels.length / 8));
          if (index % showEvery !== 0 && index !== labels.length - 1) return null;
          return (
            <text
              key={`${label}-${index}`}
              x={x}
              y={HEIGHT - 24}
              textAnchor="middle"
              fontSize="11"
              fill="#5C6C75"
            >
              {String(label).slice(0, 14)}
            </text>
          );
        })}
      </svg>
      {chart.series.length > 1 && (
        <div className="flex flex-wrap justify-center gap-4">
          {chart.series.map((entry, index) => (
            <span
              key={entry.name}
              className="inline-flex items-center gap-1.5 text-xs text-[#5C6C75]"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {entry.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FactoryChart({ chart }) {
  if (!chart?.series?.length) return null;
  return (
    <section className="mt-3 rounded-xl border border-[#D8E3DF] bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#112733]">{chart.title}</h3>
        {chart.description && (
          <p className="mt-1 text-xs leading-5 text-[#5C6C75]">
            {chart.description}
          </p>
        )}
      </div>
      {chart.type === "donut" ? (
        <DonutChart chart={chart} />
      ) : (
        <CartesianChart chart={chart} />
      )}
      <details className="mt-4 border-t border-[#E8EDEB] pt-3">
        <summary className="cursor-pointer text-xs font-medium text-[#00684A]">
          View chart data
        </summary>
        <div className="mt-2 max-h-36 overflow-auto text-xs text-[#5C6C75]">
          {chart.series.map((entry) => (
            <div key={entry.name} className="mb-2">
              <span className="font-medium text-[#112733]">{entry.name}: </span>
              {entry.data
                .map(
                  (point) =>
                    `${point.label} ${formatValue(point.value)}${chart.unit ? ` ${chart.unit}` : ""}`
                )
                .join(" · ")}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
