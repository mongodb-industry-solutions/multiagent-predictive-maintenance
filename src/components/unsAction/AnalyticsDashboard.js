"use client";

import Icon from "@leafygreen-ui/icon";
import { H3, Body, Description } from "@leafygreen-ui/typography";

function EmptyChart() {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg bg-[#F8FAF9] text-center">
      <Icon glyph="Diagram" size={24} className="text-[#889397]" />
      <Description className="mt-2">No production data in this view</Description>
    </div>
  );
}

function ChartCard({ title, description, pipeline, onOpenPipeline, children }) {
  return (
    <div className="rounded-2xl border border-[#D8E3DF] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <H3 className="!text-base !leading-6 text-[#112733]">{title}</H3>
          {description && (
            <Description className="mt-1 text-xs">{description}</Description>
          )}
        </div>
        {pipeline && (
          <button
            type="button"
            onClick={() => onOpenPipeline(title, pipeline)}
            title="View MongoDB aggregation pipeline"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#C1C7C6] font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
          >
            {"{}"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function BarChart({ data, color = "#00684A" }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return (
    <div className="flex h-48 items-end gap-2" aria-label="Bar chart">
      {data.map((item) => {
        const height = Math.max(4, ((Number(item.value) || 0) / max) * 100);
        return (
          <div
            key={item.label}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            title={`${item.label}: ${item.value}`}
          >
            <span className="mb-1 text-center text-xs font-semibold text-[#3D4F58]">
              {item.value}
            </span>
            <span
              className="mx-auto w-full max-w-12 rounded-t-md transition-all"
              style={{ height: `${height}%`, backgroundColor: color }}
            />
            <span className="mt-2 truncate text-center text-[10px] text-[#5C6C75]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data }) {
  if (data.length < 2) return <EmptyChart />;
  const values = data.map((item) => Number(item.value) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((item, index) => ({
    ...item,
    x: 22 + (index / (data.length - 1)) * 456,
    y: 150 - ((Number(item.value) - min) / range) * 118,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="h-48 w-full">
      <svg
        viewBox="0 0 500 180"
        role="img"
        aria-label="Cycle time trend"
        className="h-full w-full overflow-visible"
      >
        {[32, 71, 111, 150].map((y) => (
          <line
            key={y}
            x1="22"
            x2="478"
            y1={y}
            y2={y}
            stroke="#D8E3DF"
            strokeDasharray="4 4"
          />
        ))}
        <polyline
          points={`22,150 ${polyline} 478,150`}
          fill="rgba(0, 163, 92, 0.10)"
          stroke="none"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="#00684A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#00A35C"
              stroke="white"
              strokeWidth="2"
            />
            {(index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(points.length / 5) === 0) && (
              <text
                x={point.x}
                y="172"
                textAnchor="middle"
                fontSize="9"
                fill="#5C6C75"
              >
                {String(point.label).slice(-9)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ entries, colors }) {
  const total = entries.reduce(
    (sum, entry) => sum + (Number(entry.value) || 0),
    0
  );
  if (!total) return <EmptyChart />;
  let cursor = 0;
  const stops = entries.map((entry, index) => {
    const start = cursor;
    cursor += ((Number(entry.value) || 0) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return (
    <div className="flex h-48 items-center justify-center gap-7">
      <div
        className="relative h-36 w-36 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
      >
        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-semibold text-[#112733]">{total}</span>
          <Description className="text-xs">total</Description>
        </div>
      </div>
      <div className="grid gap-2">
        {entries.map((entry, index) => (
          <div key={entry.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-[#5C6C75]">{entry.label}</span>
            <span className="ml-auto font-semibold text-[#112733]">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ analytics, onOpenPipeline }) {
  const kpis = analytics?.kpis || {};
  const pipelines = analytics?.pipelines || {};
  const throughput = (analytics?.throughput || []).slice(-10).map((point) => ({
    label: new Date(point.bucket).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: point.count,
  }));
  const cycleTrend = (analytics?.cycle_time_trend || [])
    .slice(-20)
    .map((point) => ({
      label: point.label,
      value: point.cycle_time_sec,
    }));
  const defects = (analytics?.defects_by_station || []).map((entry) => ({
    label: entry.station
      .replace("Ultrasonic ", "")
      .replace("Pouch / Pack ", ""),
    value: entry.defects,
  }));
  const yieldEntries = [
    { label: "Pass", value: analytics?.yield?.pass || 0 },
    { label: "Fail", value: analytics?.yield?.fail || 0 },
  ];
  const gradeEntries = Object.entries(
    analytics?.grade_distribution || {}
  ).map(([label, value]) => ({ label, value }));

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Units produced", kpis.total_units ?? 0, "today"],
          [
            "First-pass yield",
            `${Number(kpis.first_pass_yield || 0).toFixed(1)}%`,
            "today",
          ],
          [
            "Average cycle",
            `${Number(kpis.avg_cycle_time_sec || 0).toFixed(2)}s`,
            "per unit",
          ],
          ["Active orders", kpis.active_orders ?? 0, "running"],
          ["Open alerts", kpis.open_alerts ?? 0, "today"],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-xl border border-[#D8E3DF] bg-white p-4 shadow-sm"
          >
            <Description>{label}</Description>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#112733]">
              {value}
            </p>
            <Body className="mt-1 text-xs text-[#00684A]">{detail}</Body>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Throughput"
          description="Completed units per hour today"
          pipeline={pipelines.throughput}
          onOpenPipeline={onOpenPipeline}
        >
          <BarChart data={throughput} />
        </ChartCard>
        <ChartCard
          title="First-pass yield"
          description="Final EOL result distribution"
          pipeline={pipelines.yield}
          onOpenPipeline={onOpenPipeline}
        >
          <DonutChart
            entries={yieldEntries}
            colors={["#00A35C", "#DB3030"]}
          />
        </ChartCard>
        <ChartCard
          title="Cycle-time trend"
          description="Recent completed production units"
          pipeline={pipelines.cycle_time}
          onOpenPipeline={onOpenPipeline}
        >
          <LineChart data={cycleTrend} />
        </ChartCard>
        <ChartCard
          title="Incoming cell grade mix"
          description="Quality grade of screened cells"
          pipeline={pipelines.grade}
          onOpenPipeline={onOpenPipeline}
        >
          <DonutChart
            entries={gradeEntries}
            colors={["#00A35C", "#FFC010", "#DB6C00", "#DB3030"]}
          />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard
            title="Defects by station"
            description="Failed quality checks in today's completed units"
            pipeline={pipelines.defects}
            onOpenPipeline={onOpenPipeline}
          >
            <BarChart data={defects} color="#DB3030" />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
