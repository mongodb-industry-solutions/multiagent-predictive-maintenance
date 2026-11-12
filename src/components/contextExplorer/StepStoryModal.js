"use client";

import { useEffect } from "react";
import { Icon } from "@via-ds/icons";

const SLIDE_ORDER = [
  { id: "overview", num: "0", label: "Overview" },
  { id: "reading", num: "1", label: "The reading" },
  { id: "limit", num: "2", label: "The limit" },
  { id: "alert", num: "3", label: "The alert ★" },
  { id: "day", num: "4", label: "The whole day" },
  { id: "agent", num: "5", label: "Ask in words" },
  { id: "before", num: "6", label: "Has this happened before?" },
];

function SlideOverview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[5fr_6fr]">
      <div className="space-y-3 rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#00684A]">
          Four Operational Sources in One Engine
        </p>
        {[
          {
            name: "telemetry",
            badge: "Time Series · 24h TTL · 15,264 LTW-04 docs",
            desc: "Weld-zone temperature, laser power, and shield-gas flow on LTW-04 (self-expiring after 24 hours)",
          },
          {
            name: "alerts",
            badge: "Collection · 9 LTW-04 docs",
            desc: "LTW-04 edge condition alerts carrying machine_id & ts, with no order or material ID",
          },
          {
            name: "workorders",
            badge: "Collection · 5 LTW-04 order spans",
            desc: "Stores M1 maintenance orders alongside MES/ERP battery module order spans (startedAt → endedAt)",
          },
          {
            name: "materials",
            badge: "Collection · 3 docs",
            desc: "Tab & busbar foil master specs including maxWeldTempC thermal limits",
          },
        ].map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-[#D8E3DF] bg-white p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-base font-semibold text-[#112733]">
                {item.name}
              </code>
              <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-medium text-[#00684A]">
                {item.badge}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-[#5C6C75]">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#B8E4D2] bg-[#F3FCF8] p-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#00684A]">
            One Query · Full Context at Read Time
          </p>
          <h4 className="mt-1 text-xl font-semibold text-[#112733]">
            Why resolve context at read time instead of stamping everything at ingest?
          </h4>
          <p className="mt-1.5 text-sm leading-6 text-[#3D4F58]">
            Edge payloads arrive incomplete, ERP limits change after readings are stored, and historical events still need answers when new questions arise.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              step: "Step 1–2",
              title: "Explain a reading",
              body: "Join MAT-CU-020 to its ERP foil spec to judge 235.2 °C against the 230 °C weld limit.",
            },
            {
              step: "Step 3 ★",
              title: "Explain an alert",
              body: "Join a keyless PLC alarm at 08:14:12Z to active order WO-1001234 by time span.",
            },
            {
              step: "Step 4–5",
              title: "See the whole day — or ask in words",
              body: "Group every alarm by order, surface the 22:47 downtime fault, and let an AI agent write the pipeline.",
            },
            {
              step: "Step 6–6.1",
              title: "Find similar incidents by curve shape",
              body: "Compute a 24-point curve vector in MongoDB and search fleet excursions via Atlas Vector Search.",
            },
          ].map((card) => (
            <div
              key={card.step}
              className="rounded-xl border border-[#B8E4D2] bg-white p-3.5 shadow-2xs"
            >
              <span className="font-mono text-sm font-semibold text-[#00684A]">
                {card.step}
              </span>
              <p className="mt-0.5 text-base font-semibold text-[#112733]">
                {card.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-[#5C6C75]">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideReading({ dayStr }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#D8E3DF] bg-[#0B1620] p-5 text-[#E6EDF3]">
        <div className="flex items-center justify-between border-b border-[#1E3140] pb-3">
          <span className="text-base font-semibold text-white">
            Telemetry reading
          </span>
          <code className="font-mono text-sm text-[#7EE2A8]">
            Source: telemetry
          </code>
        </div>
        <div className="mt-4 grid gap-2 font-mono text-sm">
          {[
            ["metadata.machine_id", "LTW-04", true],
            ["metadata.signal", "weld-zone-temp", false],
            ["ts", `${dayStr}T08:14:12Z`, false],
            ["value", "235.2 °C", false],
            ["metadata.workOrder", "WO-1001234", true],
            ["metadata.materialMaster", "MAT-CU-020", true],
          ].map(([k, v, ctx]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#1E3140] bg-[#10202E] px-3 py-2"
            >
              <span className="text-[#9FB1BD]">{k}</span>
              <span
                className={
                  ctx ? "font-semibold text-[#00ED64]" : "text-white"
                }
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <div className="rounded-xl border border-[#B8E4D2] bg-white p-4">
          <div className="flex items-center gap-2 text-base font-semibold text-[#00684A]">
            <Icon glyph="CheckmarkWithCircle" size={16} />
            What the Contextualized Reading Tells Us
          </div>
          <ul className="mt-2.5 space-y-1.5 text-sm text-[#3D4F58]">
            <li>
              • Machine: <strong className="text-[#112733]">LTW-04</strong> (Tab Laser Welding Cell)
            </li>
            <li>
              • Active order:{" "}
              <strong className="text-[#112733]">WO-1001234</strong> (stamped at edge)
            </li>
            <li>
              • Material code:{" "}
              <strong className="text-[#112733]">MAT-CU-020</strong>
            </li>
            <li>
              • Measured weld-zone temperature:{" "}
              <strong className="text-[#112733]">235.2 °C</strong>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#EBCB9B] bg-[#FEF7DB] p-4">
          <div className="flex items-center gap-2 text-base font-semibold text-[#944F01]">
            <Icon glyph="Warning" size={16} />
            What We Still Don&apos;t Know
          </div>
          <p className="mt-2 text-lg font-semibold text-[#112733]">
            Is 235.2 °C acceptable or a thermal defect?
          </p>
          <p className="mt-1 text-sm leading-6 text-[#7A3D00]">
            235.2 °C is within tolerance for bimetal clad strip (245 °C), but over-limit for C11000 copper foil (230 °C) and aluminum tabs (215 °C). An ERP material ID is not an answer until expanded.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideLimit() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
      <div className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <span className="font-mono text-sm font-semibold uppercase text-[#5C6C75]">
          1 · In the Telemetry Payload
        </span>
        <p className="mt-3 font-mono text-2xl font-bold text-[#112733]">
          MAT-CU-020
        </p>
        <p className="mt-1 font-mono text-base text-[#3D4F58]">
          weldTempC: 235.2 °C
        </p>
        <p className="mt-3 text-sm leading-6 text-[#5C6C75]">
          Raw ERP material code stamped on the sensor event. Carries no thermal threshold, alloy name, or foil supplier.
        </p>
      </div>

      <div className="text-center font-mono text-sm font-semibold text-[#00684A]">
        $lookup →
      </div>

      <div className="rounded-2xl border border-[#00A35C] bg-[#E3FCF7]/65 p-5">
        <span className="font-mono text-sm font-semibold uppercase text-[#00684A]">
          2 · Joined Material Master
        </span>
        <p className="mt-3 text-lg font-bold text-[#112733]">
          Nickel-plated C11000 copper tab foil
        </p>
        <p className="mt-1 font-mono text-base font-semibold text-[#00684A]">
          Aurubis · maxWeldTempC: 230 °C
        </p>
        <p className="mt-3 text-sm leading-6 text-[#3D4F58]">
          Resolved at read time from <code>materials</code>. If engineering updates the thermal spec tomorrow, historical queries immediately reflect it.
        </p>
      </div>

      <div className="text-center font-mono text-sm font-semibold text-[#DB6C00]">
        $gt →
      </div>

      <div className="rounded-2xl border border-[#EBCB9B] bg-[#FEF7DB] p-5">
        <span className="font-mono text-sm font-semibold uppercase text-[#944F01]">
          3 · Computed Verdict
        </span>
        <p className="mt-3 font-mono text-2xl font-bold text-[#944F01]">
          235.2 &gt; 230 °C
        </p>
        <p className="mt-1 font-mono text-base font-semibold text-[#8C210F]">
          overLimit: true
        </p>
        <p className="mt-3 text-sm leading-6 text-[#7A3D00]">
          Computed directly inside <code>$project</code> in a single MongoDB query — no second database round-trip.
        </p>
      </div>
    </div>
  );
}

function SlideAlert() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
        <div className="rounded-2xl border border-[#FFCDC7] bg-[#FFEAE5]/55 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold uppercase text-[#8C210F]">
              Alert Event (Point in Time)
            </span>
            <code className="font-mono text-sm text-[#8C210F]">08:14:12Z</code>
          </div>
          <p className="mt-2 text-base font-semibold text-[#112733]">
            Weld-zone temperature exceeded
          </p>
          <p className="mt-0.5 font-mono text-sm text-[#5C6C75]">
            machine_id: LTW-04 · priority: 1
          </p>
          <div className="mt-3 border-t border-dashed border-[#FFCDC7] pt-2.5 font-mono text-sm text-[#8C210F]">
            <div>workOrder: ? (missing)</div>
            <div>product: ? (missing)</div>
            <div>operatorId: ? (missing)</div>
          </div>
        </div>

        <div className="text-center font-mono text-sm font-semibold text-[#00684A]">
          falls inside →
        </div>

        <div className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold uppercase text-[#00684A]">
              Order Span (workorders)
            </span>
            <code className="font-mono text-sm text-[#3D4F58]">
              08:00 → 14:00
            </code>
          </div>
          <p className="mt-2 font-mono text-base font-semibold text-[#112733]">
            startedAt ≤ $$t &amp;&amp; endedAt &gt; $$t
          </p>
          <p className="mt-2 text-sm leading-6 text-[#5C6C75]">
            Interval <code>$lookup</code> matches <code>machine_id: &quot;LTW-04&quot;</code> and compares <code>ts</code> against each production order&apos;s start/end window.
          </p>
        </div>

        <div className="text-center font-mono text-sm font-semibold text-[#00684A]">
          resolves →
        </div>

        <div className="rounded-2xl border border-[#00A35C] bg-[#E3FCF7]/65 p-5">
          <span className="font-mono text-sm font-semibold uppercase text-[#00684A]">
            Contextualized Alert
          </span>
          <div className="mt-2.5 space-y-1 font-mono text-sm text-[#112733]">
            <div>
              workOrder:{" "}
              <strong className="text-[#00684A]">WO-1001234</strong>
            </div>
            <div>
              product: <strong className="text-[#00684A]">EV-PM-4C-S</strong>
            </div>
            <div>
              plannedQty: <strong>100 packs</strong>
            </div>
            <div>
              operatorId: <strong className="text-[#00684A]">A. Vogel</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            tone: "border-[#FFCDC7] bg-[#FFEAE5]/35",
            title: "Write-Time Stamping",
            body: "Fails when PLC alarms have no MES awareness, and locks in stale IDs if MES split/re-dates an order later.",
          },
          {
            tone: "border-[#EBCB9B] bg-[#FEF7DB]/55",
            title: "Nightly Batch ETL",
            body: "Leaves plant supervisors blind during the shift and requires pipeline rebuilds for every new grouping.",
          },
          {
            tone: "border-[#00A35C] bg-[#E3FCF7]/55",
            title: "Read-Time Interval Join",
            body: "Zero ETL lag, survives MES schedule corrections retroactively, and works on historical un-stamped alerts.",
          },
        ].map((way) => (
          <div key={way.title} className={`rounded-xl border p-3.5 ${way.tone}`}>
            <p className="text-base font-semibold text-[#112733]">{way.title}</p>
            <p className="mt-1 text-sm leading-5 text-[#3D4F58]">{way.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideDay({ dayStr }) {
  const bands = [
    { label: "WO-1001232", sub: "EV-PM-4C-S", width: "25%", hot: false },
    { label: "…1233", sub: "4C-P", width: "8.33%", hot: false },
    {
      label: "WO-1001234",
      sub: "EV-PM-4C-S · 4 alerts (2 P1)",
      width: "25%",
      hot: true,
    },
    { label: "WO-1001235", sub: "EV-PK-8M", width: "16.67%", hot: false },
    { label: "WO-1001236", sub: "EV-PM-4C-S", width: "16.67%", hot: false },
    { label: "no order", sub: "22:47", width: "8.33%", gap: true },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#00684A]">
            24-Hour Order Timeline on LTW-04 · {dayStr}
          </span>
          <span className="font-mono text-sm text-[#5C6C75]">
            9 LTW-04 alerts across 6 groups
          </span>
        </div>

        <div className="flex h-20 w-full overflow-hidden rounded-xl border border-[#C1C7C6]">
          {bands.map((b) => (
            <div
              key={b.label}
              style={{ width: b.width }}
              className={`flex min-w-0 flex-col justify-center border-r border-white/50 px-2.5 py-1.5 text-left last:border-r-0 ${
                b.hot
                  ? "bg-[#00684A] text-white"
                  : b.gap
                    ? "bg-[#FFEAE5] text-[#8C210F]"
                    : "bg-white text-[#112733]"
              }`}
            >
              <span className="truncate font-mono text-sm font-semibold">
                {b.label}
              </span>
              <span
                className={`truncate text-sm ${
                  b.hot
                    ? "text-[#E3FCF7]"
                    : b.gap
                      ? "text-[#8C210F]"
                      : "text-[#5C6C75]"
                }`}
              >
                {b.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-2 flex justify-between font-mono text-sm text-[#5C6C75]">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#00A35C] bg-[#E3FCF7]/55 p-4">
          <p className="text-base font-semibold text-[#00684A]">
            Main Finding #1 · Hotspot Order Identified
          </p>
          <p className="mt-1 text-sm leading-6 text-[#112733]">
            <strong>WO-1001234</strong> (operator <strong>A. Vogel</strong>,{" "}
            <code>EV-PM-4C-S</code>) accounted for <strong>4 alerts</strong>{" "}
            including <strong>2 priority-1 thermal/spatter alarms</strong>, while every other order had only 1 low-severity event.
          </p>
        </div>

        <div className="rounded-2xl border border-[#FFCDC7] bg-[#FFEAE5]/45 p-4">
          <p className="text-base font-semibold text-[#8C210F]">
            Main Finding #2 · Unscheduled Downtime Fault Preserved
          </p>
          <p className="mt-1 text-sm leading-6 text-[#112733]">
            Because <code>preserveNullAndEmptyArrays: true</code> keeps unmatched alarms, the <strong>22:47Z</strong> shield-gas alert after the last order ended at 22:00 surfaces as a real post-shift fault rather than being silently dropped.
          </p>
        </div>
      </div>
    </div>
  );
}

function SlideAgent() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
      <div className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <span className="font-mono text-sm font-semibold uppercase text-[#00684A]">
          1 · Plain-Language Question
        </span>
        <p className="mt-3 text-lg font-semibold text-[#112733]">
          &ldquo;Which order had the most alerts on LTW-04 today?&rdquo;
        </p>
        <p className="mt-2 text-sm leading-6 text-[#5C6C75]">
          Plant managers and reliability engineers ask operational questions in words rather than hand-authoring <code>$lookup</code> stages.
        </p>
      </div>

      <div className="text-center font-mono text-sm font-semibold text-[#00684A]">
        LangGraph →
      </div>

      <div className="rounded-2xl border border-[#0B1620] bg-[#0B1620] p-5 text-[#E6EDF3]">
        <span className="font-mono text-sm font-semibold uppercase text-[#00ED64]">
          2 · Read-Only MongoDB Pipeline
        </span>
        <pre className="mt-3 overflow-x-auto font-mono text-sm leading-6 text-[#7EE2A8]">
          {`db.alerts.aggregate([
  { $match: { machine_id: "LTW-04", ... } },
  { $lookup: { from: "workorders", ... } },
  { $group: { _id: "$order.workOrder", ... } }
])`}
        </pre>
        <p className="mt-2 text-sm leading-5 text-[#9FB1BD]">
          Strictly read-only tools; outputs wrapped in <code>&lt;untrusted-user-data&gt;</code> prompt-injection protection.
        </p>
      </div>

      <div className="text-center font-mono text-sm font-semibold text-[#00684A]">
        executes →
      </div>

      <div className="rounded-2xl border border-[#00A35C] bg-[#E3FCF7]/65 p-5">
        <span className="font-mono text-sm font-semibold uppercase text-[#00684A]">
          3 · Grounded Actionable Answer
        </span>
        <ul className="mt-3 space-y-1.5 text-sm leading-6 text-[#112733]">
          <li>
            • <strong>WO-1001234</strong>: 4 alerts, 2 priority-1 — investigate first.
          </li>
          <li>
            • <strong>4 other orders</strong>: 1 non-critical alert each.
          </li>
          <li>
            • <strong>1 orderless alert (22:47Z)</strong>: post-shift argon purge dip.
          </li>
        </ul>
      </div>
    </div>
  );
}

function SlideBefore() {
  const humpPoints = Array.from({ length: 24 }, (_, i) => {
    const p = (i - 6) / 9;
    const yVal = p >= 0 && p <= 1 ? Math.sin(p * Math.PI) : 0;
    const x = (12 + (i / 23) * 296).toFixed(1);
    const y = (96 - yVal * 72).toFixed(1);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="grid gap-6 lg:grid-cols-[5fr_6fr]">
      <div className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#00684A]">
          The Event Shape · 4 Minutes Around 08:14
        </p>
        <p className="mt-1 text-base font-semibold text-[#112733]">
          LTW-04 · weld-zone-temp · Peak 235.0 °C
        </p>

        <div className="mt-4 rounded-xl border border-[#B8E4D2] bg-white p-4">
          <svg viewBox="0 0 320 112" className="h-28 w-full">
            <line
              x1="12"
              x2="308"
              y1="42"
              y2="42"
              stroke="#DB6C00"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text x="16" y="36" fill="#944F01" fontSize="11" fontFamily="monospace">
              230 °C limit
            </text>
            <polyline
              fill="none"
              stroke="#00A35C"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={humpPoints}
            />
          </svg>
          <div className="mt-1 flex justify-between font-mono text-sm text-[#5C6C75]">
            <span>08:12:30</span>
            <span>08:14:30</span>
            <span>08:16:30</span>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#3D4F58]">
          MongoDB buckets the 240 raw readings in <code>telemetry</code> into <strong>24 ten-second bins</strong> and z-scores them in-database — capturing the <em>shape</em> of the thermal excursion without moving telemetry out to an external model.
        </p>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#00A35C] bg-[#F3FCF8] p-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#00684A]">
            Atlas Vector Search Across Fleet Excursions
          </p>
          <h4 className="mt-1 text-lg font-semibold text-[#112733]">
            Same soft-hill curve across plants &amp; materials → same optics spatter cause
          </h4>
        </div>

        <div className="space-y-2">
          {[
            ["0.993", "LTW-02 · leafy-ev-02", "MAT-AL-030", "open case — unlinked!", "open"],
            ["0.987", "LTW-04 · leafy-ev-01", "MAT-AL-030", "protective window spatter", "closed"],
            ["0.980", "LTW-03 · leafy-ev-02", "MAT-CU-020", "protective window spatter", "closed"],
            ["0.980", "LTW-03 · leafy-ev-02", "MAT-CU-025", "protective window spatter", "closed"],
          ].map(([sim, cell, mat, cause, status]) => (
            <div
              key={`${cell}-${mat}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#B8E4D2] bg-white px-3.5 py-2 text-sm"
            >
              <span className="font-mono font-bold text-[#00684A]">{sim}</span>
              <span className="font-mono text-[#112733]">{cell}</span>
              <span className="font-mono text-[#5C6C75]">{mat}</span>
              <span
                className={
                  status === "open"
                    ? "rounded bg-[#FEF7DB] px-2 py-0.5 font-semibold text-[#944F01]"
                    : "font-medium text-[#00684A]"
                }
              >
                {cause}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm leading-6 text-[#3D4F58]">
          In <strong>Step 6.1</strong>, adding <code>materialMaster: &quot;MAT-CU-020&quot;</code> inside <code>$vectorSearch.filter</code> pre-filters before HNSW scoring — proving the shape crosses materials so you inspect weld optics before blaming the copper foil supplier.
        </p>
      </div>
    </div>
  );
}

export default function StepStoryModal({
  open,
  dayStr = "today",
  slideId,
  onSelectSlide,
  onClose,
}) {
  const currentIndex = Math.max(
    0,
    SLIDE_ORDER.findIndex((s) => s.id === slideId)
  );
  const activeSlide = SLIDE_ORDER[currentIndex] || SLIDE_ORDER[0];

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "p") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight" && currentIndex < SLIDE_ORDER.length - 1) {
        event.preventDefault();
        onSelectSlide(SLIDE_ORDER[currentIndex + 1].id);
      } else if (event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault();
        onSelectSlide(SLIDE_ORDER[currentIndex - 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, onClose, onSelectSlide, open]);

  if (!open) return null;

  const titles = {
    overview: {
      title: "Connected Factory · Context at Read Time",
      subtitle:
        "Unify EV battery welding telemetry, alerts, production workorders, and ERP material limits in one operational data layer.",
    },
    reading: {
      title: "1 — The reading",
      subtitle: "A raw sensor reading gives context, but not the answer.",
    },
    limit: {
      title: "2 — The limit",
      subtitle: "Add the material master thermal limit at read time to judge the reading.",
    },
    alert: {
      title: "3 — The alert ★",
      subtitle: "The PLC alert knows the welding cell and timestamp, not the active work order.",
    },
    day: {
      title: "4 — The whole day",
      subtitle: "The same interval join grouped across every alert of the production day.",
    },
    agent: {
      title: "5 — Ask in words",
      subtitle: "A plant manager asks the same operational question in plain language.",
    },
    before: {
      title: "6 — Has this happened before?",
      subtitle: "Compute a 24-point thermal curve vector in MongoDB and search fleet history with Atlas Vector Search.",
    },
  };

  const meta = titles[activeSlide.id] || titles.overview;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061E2E]/85 p-4 sm:p-8"
    >
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#D8E3DF] bg-[#F8FAF9] px-6 py-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-semibold text-[#00684A]">
              Leafy Factory · Story Visual
            </span>
            <h3 className="mt-1.5 text-2xl font-bold text-[#112733]">
              {meta.title}
            </h3>
            <p className="mt-0.5 text-base text-[#5C6C75]">{meta.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close visual explainer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C1C7C6] bg-white text-[#112733] hover:bg-[#F1F5F3]"
          >
            <Icon glyph="X" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {activeSlide.id === "overview" && <SlideOverview />}
          {activeSlide.id === "reading" && <SlideReading dayStr={dayStr} />}
          {activeSlide.id === "limit" && <SlideLimit />}
          {activeSlide.id === "alert" && <SlideAlert />}
          {activeSlide.id === "day" && <SlideDay dayStr={dayStr} />}
          {activeSlide.id === "agent" && <SlideAgent />}
          {activeSlide.id === "before" && <SlideBefore />}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D8E3DF] bg-[#F8FAF9] px-6 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {SLIDE_ORDER.map((s) => {
              const active = s.id === activeSlide.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSlide(s.id)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    active
                      ? "bg-[#00684A] text-white"
                      : "bg-white text-[#5C6C75] hover:bg-[#E8EDEB]"
                  }`}
                >
                  {s.num} · {s.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-sm text-[#5C6C75]">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => onSelectSlide(SLIDE_ORDER[currentIndex - 1].id)}
              className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-1 font-medium text-[#112733] hover:bg-[#F1F5F3] disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={currentIndex === SLIDE_ORDER.length - 1}
              onClick={() => onSelectSlide(SLIDE_ORDER[currentIndex + 1].id)}
              className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-1 font-medium text-[#112733] hover:bg-[#F1F5F3] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
