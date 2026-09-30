"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------- icons ------------------------------- */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-6 w-6",
  "aria-hidden": true,
};

function ScadaIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.8" />
      <path d="M9 20.5h6M12 16.5v4" />
      <path d="M6 11.5l2-3 2 4.5 2-6 2 5 2-2.5" />
    </svg>
  );
}

function PlcIcon() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" rx="0.8" />
      <path d="M9 6V3.5M15 6V3.5M9 20.5V18M15 20.5V18M6 9H3.5M6 15H3.5M20.5 9H18M20.5 15H18" />
    </svg>
  );
}

function SensorIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="17.5" r="2" />
      <path d="M7.4 13.6a6.5 6.5 0 0 1 9.2 0" />
      <path d="M4.6 10.4a10.5 10.5 0 0 1 14.8 0" />
    </svg>
  );
}

function HistorianIcon() {
  return (
    <svg {...iconProps}>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6" />
      <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" />
    </svg>
  );
}

function ErpIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="4" width="17" height="16" rx="1.8" />
      <path d="M3.5 9.5h17M3.5 15h17M9.5 4v16M15 4v16" />
    </svg>
  );
}

function MesIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="4" width="17" height="6" rx="1.6" />
      <rect x="3.5" y="14" width="17" height="6" rx="1.6" />
      <path d="M7 7h.01M7 17h.01M10 7h.01M10 17h.01" />
      <path d="M15 7h3M15 17h3" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20.5h9" />
      <path d="M6.5 20.5V13l5-6.5" />
      <path d="M11.5 6.5l6 2.5" />
      <circle cx="6.5" cy="13" r="1.6" />
      <circle cx="11.6" cy="6.4" r="1.6" />
      <path d="M17 8.4l3 1.6-1.6 3-3-1.6z" />
    </svg>
  );
}

function CmmsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14.8 3.5a5.2 5.2 0 0 0-6.4 6.8l-4.9 4.9a1.8 1.8 0 0 0 0 2.6l1.7 1.7a1.8 1.8 0 0 0 2.6 0l4.9-4.9a5.2 5.2 0 0 0 6.8-6.4l-3 3-2.6-.6-.6-2.6z" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.4-2h6.2l1.4 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function SpreadsheetIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5.5 3.5h8.2l4.8 4.8v11.4a1.8 1.8 0 0 1-1.8 1.8H5.5a1.8 1.8 0 0 1-1.8-1.8V5.3a1.8 1.8 0 0 1 1.8-1.8z" />
      <path d="M13.5 3.6V8.3h4.7" />
      <path d="M7 12.6h9M7 16.6h9M11.5 12.6v6.6" />
    </svg>
  );
}

/* ------------------------------- layout data ------------------------------- */

// `x` / `y` are the scattered ("before") positions in 0..1 stage units.
const NODES = [
  { id: "scada", label: "SCADA", Icon: ScadaIcon, x: 0.11, y: 0.13 },
  { id: "plc", label: "PLCs", Icon: PlcIcon, x: 0.08, y: 0.55 },
  { id: "sensors", label: "Sensors", Icon: SensorIcon, x: 0.17, y: 0.86 },
  { id: "historian", label: "Historians", Icon: HistorianIcon, x: 0.41, y: 0.9 },
  { id: "erp", label: "ERP", Icon: ErpIcon, x: 0.33, y: 0.35 },
  // Kept clear of the stage centre, which the invitation and then the hub occupy.
  { id: "mes", label: "MES", Icon: MesIcon, x: 0.57, y: 0.69 },
  { id: "robots", label: "Robots", Icon: RobotIcon, x: 0.63, y: 0.11 },
  { id: "cmms", label: "CMMS", Icon: CmmsIcon, x: 0.87, y: 0.29 },
  { id: "vision", label: "Vision", Icon: VisionIcon, x: 0.92, y: 0.65 },
  { id: "excel", label: "Excel", Icon: SpreadsheetIcon, x: 0.71, y: 0.88 },
];

const NODE_INDEX = new Map(NODES.map((node, index) => [node.id, index]));

// The point-to-point integrations of the "before" state. Each pair is a link that
// genuinely exists on a plant floor, following the ISA-95 layers: field devices
// wire into controllers, controllers feed supervisory and historical systems, and
// the operations systems exchange orders and work requests. Nothing skips layers
// implausibly — no sensor wired straight into ERP, and no spreadsheet speaking to a
// controller. The mess being illustrated is the sheer number of point-to-point
// integrations a real plant accumulates, not invented ones.
const CONNECTIONS = [
  ["sensors", "plc"], // hardwired field I/O
  ["plc", "scada"], // controllers polled for supervisory control
  ["plc", "robots"], // cell sequencing and interlocks
  ["plc", "historian"], // tag logging straight off the controller
  ["robots", "vision"], // vision-guided pick and place
  ["vision", "mes"], // inline quality results
  ["scada", "historian"], // process history
  ["scada", "mes"], // live production status
  ["scada", "cmms"], // alarms raising work orders
  ["mes", "erp"], // production orders and confirmations
  ["mes", "cmms"], // downtime driving maintenance
  ["cmms", "erp"], // spare parts, purchasing and cost

  // The spreadsheet layer, and the reason it belongs here: nothing reaches it over
  // a protocol. Every link below is an export or a person typing, which is exactly
  // why the data stops once it arrives.
  ["sensors", "excel"], // route-based vibration and temperature rounds, typed in
  ["historian", "excel"], // tag trends exported for offline analysis
  ["mes", "excel"], // shift and OEE reports rebuilt every morning
  ["cmms", "excel"], // maintenance history and spare-part lists
  ["excel", "erp"], // manual planning and cost reconciliation
];

const TANGLES = CONNECTIONS.map(([from, to]) => [
  NODE_INDEX.get(from),
  NODE_INDEX.get(to),
]);

// Ring slots are handed out in angular order around the centre so nodes take the
// shortest path outward and their connections never cross while morphing.
const RING_ANGLES = (() => {
  const step = (Math.PI * 2) / NODES.length;
  const order = NODES.map((node, index) => ({
    index,
    angle: Math.atan2(node.y - 0.5, node.x - 0.5),
  })).sort((a, b) => a.angle - b.angle);

  const angles = new Array(NODES.length);
  order.forEach((entry, slot) => {
    angles[entry.index] = -Math.PI + slot * step;
  });
  return angles;
})();

const MORPH_MS = 1250;
// The stage is padded by its parent, so the layout uses the full height and
// stays vertically centred in the space it is given.
const BOTTOM_INSET = 0;

// The pointer gently pushes nearby systems away from it and they drift back once
// it moves on. Their connections are drawn from the same points, so the whole
// web breathes with the cursor.
const POINTER_INFLUENCE = 180;
const POINTER_PUSH = 9;
const POINTER_EASE = 0.03;

// Travelling dashes: one seamless loop is exactly one dash period, so the
// pattern never jumps when it wraps.
const DASH = 2;
const GAP = 17;
const DASH_PERIOD = DASH + GAP;
const DASH_SPEED = 19; // px per second

// Idle float: a slow, shallow drift, closer to breathing than to bobbing.
const FLOAT_AMPLITUDE = 3.4;
const FLOAT_SPEED_X = 0.3;
const FLOAT_SPEED_Y = 0.25;
// Empty space a connection must leave around any node it passes. It has to
// absorb the idle float of both the node and the connection's own endpoints.
const CLEARANCE = 20;
// Bow strengths tried when routing a tangled connection. Ordered by preference
// rather than magnitude: a visible sweep looks better than a near-straight line,
// so mid curves are tried first and flatter ones only as a fallback.
const BOW_CANDIDATES = [
  0.17, -0.17, 0.24, -0.24, 0.12, -0.12, 0.32, -0.32, 0.08, -0.08, 0.42, -0.42,
  0.04, -0.04, 0.55, -0.55,
];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function controlPoint(from, to, bow) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    x: (from.x + to.x) / 2 - dy * bow,
    y: (from.y + to.y) / 2 + dx * bow,
  };
}

// Signed clearance between a point and a node's bounding box: negative means the
// point sits inside the box.
function boxClearance(px, py, node, half) {
  const dx = Math.abs(px - node.x) - half.w;
  const dy = Math.abs(py - node.y) - half.h;
  if (dx < 0 && dy < 0) return Math.max(dx, dy);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
}

// Smallest clearance between a quadratic curve and both the nodes it is not
// attached to and the edges of the stage.
function curveClearance(from, control, to, positions, halves, skipA, skipB, bounds) {
  let worst = Infinity;
  for (let step = 0; step <= 20; step += 1) {
    const s = step / 20;
    const m = 1 - s;
    const px = m * m * from.x + 2 * m * s * control.x + s * s * to.x;
    const py = m * m * from.y + 2 * m * s * control.y + s * s * to.y;

    const edge = Math.min(
      px - bounds.margin,
      bounds.w - bounds.margin - px,
      py - bounds.margin,
      bounds.h - bounds.margin - py
    );
    if (edge < worst) worst = edge;

    for (let n = 0; n < positions.length; n += 1) {
      if (n === skipA || n === skipB) continue;
      const clearance = boxClearance(px, py, positions[n], halves[n]);
      if (clearance < worst) worst = clearance;
    }
  }
  return worst;
}

/* ------------------------------- component ------------------------------- */

export default function FactoryConstellation() {
  const [unified, setUnified] = useState(false);

  const stageRef = useRef(null);
  const hubRef = useRef(null);
  const hubGlowRef = useRef(null);
  const nodeRefs = useRef([]);
  const tangleRefs = useRef([]);
  const spokeRefs = useRef([]);

  const sizeRef = useRef({ w: 0, h: 0 });
  const nodeHalfRef = useRef([]);
  const bowsRef = useRef(TANGLES.map(() => 0.14));
  const hubRadiusRef = useRef(80);
  const hintRef = useRef(null);
  const targetRef = useRef(0);
  const morphRef = useRef({ from: 0, to: 0, startedAt: -1 });
  const progressRef = useRef(0);
  const stageRectRef = useRef(null);
  const pointerRef = useRef({ active: false, x: 0, y: 0 });
  const nudgeRef = useRef(NODES.map(() => ({ x: 0, y: 0 })));

  const handlePointerMove = useCallback((event) => {
    const rect = stageRectRef.current;
    if (!rect) return;
    pointerRef.current = {
      active: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  const toggle = useCallback(() => {
    setUnified((previous) => {
      const next = !previous;
      targetRef.current = next ? 1 : 0;
      morphRef.current = {
        from: progressRef.current,
        to: targetRef.current,
        startedAt: performance.now(),
      };
      return next;
    });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      sizeRef.current = { w, h };
      // Cached so pointer moves never force a layout read mid-animation.
      stageRectRef.current = stage.getBoundingClientRect();
      if (hubRef.current) {
        hubRadiusRef.current = hubRef.current.offsetWidth / 2;
      }

      const halves = nodeRefs.current.map((el) =>
        el
          ? { w: el.offsetWidth / 2, h: el.offsetHeight / 2 }
          : { w: 30, h: 34 }
      );
      nodeHalfRef.current = halves;

      // Connection routing only depends on the stage size, so it is solved here
      // rather than every frame. Node float is small next to CLEARANCE.
      if (!w || !h) return;
      const usableH = Math.max(h - BOTTOM_INSET, 120);
      const scattered = NODES.map((node) => ({
        x: node.x * w,
        y: node.y * usableH,
      }));
      const keepOut = halves.map((half) => ({
        w: half.w + CLEARANCE,
        h: half.h + CLEARANCE,
      }));

      // The centre is reserved too: it keeps the invitation legible and leaves the
      // hub an uncluttered spot to grow into, rather than arriving on top of a
      // knot of lines. Whichever of the two is larger wins.
      const hint = hintRef.current;
      const reserved = hubRadiusRef.current * 0.6;
      scattered.push({ x: w / 2, y: usableH / 2 });
      keepOut.push({
        w: Math.max(reserved, (hint ? hint.offsetWidth / 2 : 90) + 14),
        h: Math.max(reserved, (hint ? hint.offsetHeight / 2 : 10) + 14),
      });

      const bounds = { w, h: usableH, margin: 10 };

      bowsRef.current = TANGLES.map(([a, b]) => {
        let best = BOW_CANDIDATES[0];
        let bestClearance = -Infinity;
        for (const bow of BOW_CANDIDATES) {
          const control = controlPoint(scattered[a], scattered[b], bow);
          const clearance = curveClearance(
            scattered[a],
            control,
            scattered[b],
            scattered,
            keepOut,
            a,
            b,
            bounds
          );
          if (clearance > 0) return bow;
          if (clearance > bestClearance) {
            bestClearance = clearance;
            best = bow;
          }
        }
        return best;
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    if (hubRef.current) observer.observe(hubRef.current);
    // Node boxes are observed too: their width depends on the label, which only
    // settles once webfonts have loaded.
    nodeRefs.current.forEach((el) => el && observer.observe(el));

    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let frame = 0;
    const startedAt = performance.now();

    const render = (now) => {
      frame = requestAnimationFrame(render);

      const { w, h } = sizeRef.current;
      if (!w || !h) return;

      const morph = morphRef.current;
      if (morph.startedAt >= 0) {
        const k = clamp01((now - morph.startedAt) / MORPH_MS);
        progressRef.current = morph.from + (morph.to - morph.from) * easeInOutCubic(k);
        if (k >= 1) morph.startedAt = -1;
      }

      const t = progressRef.current;
      const time = reduceMotion ? 0 : (now - startedAt) / 1000;
      const pointer = reduceMotion
        ? { active: false, x: 0, y: 0 }
        : pointerRef.current;

      const usableH = Math.max(h - BOTTOM_INSET, 120);
      const cx = w / 2;
      const cy = usableH / 2;
      const hubR = hubRadiusRef.current;

      // Widest / tallest node decides how much margin the ring needs so that no
      // card is ever clipped, whatever the viewport.
      let maxHalfW = 30;
      let maxHalfH = 34;
      for (const half of nodeHalfRef.current) {
        if (!half) continue;
        if (half.w > maxHalfW) maxHalfW = half.w;
        if (half.h > maxHalfH) maxHalfH = half.h;
      }

      const rx = Math.max(40, Math.min(w * 0.44, w / 2 - maxHalfW - 4));
      const ry = Math.max(40, Math.min(usableH * 0.44, usableH / 2 - maxHalfH - 4));

      // Nodes settle down as they organise, so the float amplitude decays with `t`.
      const floatAmp = FLOAT_AMPLITUDE * (1 - 0.7 * t);
      const points = [];

      for (let i = 0; i < NODES.length; i += 1) {
        const node = NODES[i];
        const angle = RING_ANGLES[i];
        const scatterX = node.x * w;
        const scatterY = node.y * usableH;
        const ringX = cx + Math.cos(angle) * rx;
        const ringY = cy + Math.sin(angle) * ry;

        const baseX =
          scatterX +
          (ringX - scatterX) * t +
          Math.sin(time * FLOAT_SPEED_X + i * 1.7) * floatAmp;
        const baseY =
          scatterY +
          (ringY - scatterY) * t +
          Math.cos(time * FLOAT_SPEED_Y + i * 2.3) * floatAmp;

        // Repulsion is measured from the resting position, never from the nudged
        // one, so a system can't chase or oscillate against its own offset.
        let pushX = 0;
        let pushY = 0;
        if (pointer.active) {
          const dx = baseX - pointer.x;
          const dy = baseY - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < POINTER_INFLUENCE) {
            const falloff = 1 - distance / POINTER_INFLUENCE;
            const strength = (falloff * falloff * POINTER_PUSH) / Math.max(distance, 1);
            pushX = dx * strength;
            pushY = dy * strength;
          }
        }

        const nudge = nudgeRef.current[i];
        nudge.x += (pushX - nudge.x) * POINTER_EASE;
        nudge.y += (pushY - nudge.y) * POINTER_EASE;

        const half = nodeHalfRef.current[i] || { w: 30, h: 34 };
        const x = Math.min(
          Math.max(baseX + nudge.x, half.w + 2),
          w - half.w - 2
        );
        const y = Math.min(
          Math.max(baseY + nudge.y, half.h + 2),
          h - half.h - 2
        );

        points.push({ x, y });

        const el = nodeRefs.current[i];
        if (el) {
          el.style.transform = `translate(calc(${x.toFixed(2)}px - 50%), calc(${y.toFixed(2)}px - 50%))`;
        }
      }

      // One shared, continuously decreasing offset keeps every dash moving at the
      // same speed and wrapping seamlessly.
      const dashBase = -((time * DASH_SPEED) % DASH_PERIOD);

      const tangleOpacity = clamp01(1 - t * 1.8);
      const tangleHidden = tangleOpacity <= 0.001;
      for (let i = 0; i < TANGLES.length; i += 1) {
        const base = tangleRefs.current[i];
        const flow = tangleRefs.current[TANGLES.length + i];
        if (tangleHidden) {
          if (base) base.style.opacity = "0";
          if (flow) flow.style.opacity = "0";
          continue;
        }
        const [a, b] = TANGLES[i];
        const from = points[a];
        const to = points[b];
        const control = controlPoint(from, to, bowsRef.current[i]);
        const d = `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
        if (base) {
          base.setAttribute("d", d);
          base.style.opacity = String(tangleOpacity);
        }
        if (flow) {
          flow.setAttribute("d", d);
          flow.style.opacity = String(tangleOpacity * 0.75);
          flow.style.strokeDashoffset = String(
            dashBase - (i * DASH_PERIOD) / TANGLES.length
          );
        }
      }

      const spokeOpacity = clamp01((t - 0.3) / 0.6);
      const spokeHidden = spokeOpacity <= 0.001;
      for (let i = 0; i < NODES.length; i += 1) {
        const base = spokeRefs.current[i];
        const flow = spokeRefs.current[NODES.length + i];
        if (spokeHidden) {
          if (base) base.style.opacity = "0";
          if (flow) flow.style.opacity = "0";
          continue;
        }
        const from = points[i];
        const dx = cx - from.x;
        const dy = cy - from.y;
        const length = Math.hypot(dx, dy) || 1;
        const edgeX = cx - (dx / length) * (hubR + 6);
        const edgeY = cy - (dy / length) * (hubR + 6);
        const d = `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${edgeX.toFixed(1)} ${edgeY.toFixed(1)}`;
        if (base) {
          base.setAttribute("d", d);
          base.style.opacity = String(spokeOpacity);
        }
        if (flow) {
          flow.setAttribute("d", d);
          flow.style.opacity = String(spokeOpacity * 0.85);
          flow.style.strokeDashoffset = String(
            dashBase - (i * DASH_PERIOD) / NODES.length
          );
        }
      }

      const hubReveal = clamp01((t - 0.2) / 0.7);
      const hubOffset = `translate(calc(${cx.toFixed(2)}px - 50%), calc(${cy.toFixed(2)}px - 50%))`;
      if (hubRef.current) {
        const scale = 0.55 + 0.45 * hubReveal;
        hubRef.current.style.transform = `${hubOffset} scale(${scale.toFixed(3)})`;
        hubRef.current.style.opacity = String(hubReveal);
      }
      if (hubGlowRef.current) {
        const breathe = 1 + Math.sin(time * 1.1) * 0.05;
        hubGlowRef.current.style.opacity = String(0.3 + hubReveal * 0.7);
        hubGlowRef.current.style.transform = `${hubOffset} scale(${(
          (0.55 + 0.45 * hubReveal) *
          breathe
        ).toFixed(3)})`;
      }

      // The invitation sits where the hub will appear and pulses slowly all the way
      // out to invisible and back, then clears for good once the shop floor starts
      // to organise. Raising the wave to a power under one holds it readable for
      // longer than it holds it blank.
      if (hintRef.current) {
        const wave = 0.5 - 0.5 * Math.cos(time * 1.05);
        const fade = 1 - clamp01(t * 2.4);
        hintRef.current.style.opacity = String(Math.pow(wave, 0.8) * 0.85 * fade);
        hintRef.current.style.transform = hubOffset;
      }
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      ref={stageRef}
      onClick={toggle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={
        unified
          ? "Scatter the factory systems back into point-to-point integrations"
          : "Organise the factory systems around a unified namespace"
      }
      className="relative block h-full w-full cursor-pointer select-none overflow-hidden text-left focus:outline-none"
    >
      {/* Hub halo */}
      <span
        ref={hubGlowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-[clamp(240px,38vh,420px)] w-[clamp(240px,38vh,420px)] rounded-full bg-[radial-gradient(circle,rgba(0,237,100,0.3),rgba(0,104,74,0.1)_45%,transparent_70%)] opacity-0 blur-2xl"
      />

      {/* Connections */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {TANGLES.map((pair, index) => (
          <path
            key={`tangle-${pair[0]}-${pair[1]}`}
            ref={(el) => {
              tangleRefs.current[index] = el;
            }}
            fill="none"
            stroke="rgba(146,205,224,0.34)"
            strokeWidth="1"
          />
        ))}
        {TANGLES.map((pair, index) => (
          <path
            key={`tangle-flow-${pair[0]}-${pair[1]}`}
            ref={(el) => {
              tangleRefs.current[TANGLES.length + index] = el;
            }}
            fill="none"
            stroke="rgba(196,235,248,0.75)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeDasharray={`${DASH} ${GAP}`}
          />
        ))}
        {NODES.map((node, index) => (
          <path
            key={`spoke-${node.id}`}
            ref={(el) => {
              spokeRefs.current[index] = el;
            }}
            fill="none"
            stroke="rgba(0,237,100,0.3)"
            strokeWidth="1"
          />
        ))}
        {NODES.map((node, index) => (
          <path
            key={`spoke-flow-${node.id}`}
            ref={(el) => {
              spokeRefs.current[NODES.length + index] = el;
            }}
            fill="none"
            stroke="rgba(0,237,100,0.9)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeDasharray={`${DASH} ${GAP}`}
          />
        ))}
      </svg>

      {/* Central unified namespace bubble */}
      <span
        ref={hubRef}
        aria-hidden="true"
        className="absolute left-0 top-0 flex h-[clamp(102px,min(21vh,34vw),204px)] w-[clamp(102px,min(21vh,34vw),204px)] flex-col items-center justify-center rounded-full border border-[#00ED64]/35 bg-[radial-gradient(circle_at_30%_25%,rgba(0,237,100,0.34),rgba(0,104,74,0.5)_55%,rgba(0,38,40,0.92))] text-center opacity-0 shadow-[0_0_70px_-10px_rgba(0,237,100,0.6)] backdrop-blur-sm"
      >
        <span className="leafy-ring-pulse absolute inset-0 rounded-full border border-[#00ED64]/40" />
        <span
          className="leafy-ring-pulse absolute inset-0 rounded-full border border-[#00ED64]/25"
          style={{ animationDelay: "1.6s" }}
        />
        <span className="px-4 text-[clamp(0.7rem,min(1.4vh,2.6vw),1rem)] font-semibold leading-tight text-white">
          Unified
          <br />
          Namespace
        </span>
        <span className="mt-1.5 px-2 text-[clamp(0.44rem,min(0.95vh,1.6vw),0.65rem)] uppercase leading-tight tracking-[0.16em] text-[#8FE9BA]">
          Powered by MongoDB
        </span>
      </span>

      {/* Systems */}
      {NODES.map((node, index) => {
        const { Icon } = node;
        return (
          <span
            key={node.id}
            ref={(el) => {
              nodeRefs.current[index] = el;
            }}
            className="leafy-fade-in absolute left-0 top-0 flex flex-col items-center gap-1.5 will-change-transform"
            style={{ animationDelay: `${0.25 + index * 0.07}s` }}
          >
            {/* Opaque fill so connections read as passing underneath the card. */}
            <span className="flex h-[clamp(42px,5.9vh,54px)] w-[clamp(42px,5.9vh,54px)] items-center justify-center rounded-2xl border border-white/[0.14] bg-[#061A22] text-[#7FE8B2] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_30px_-14px_rgba(0,0,0,0.95)]">
              <Icon />
            </span>
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60 [text-shadow:0_1px_8px_rgba(0,9,15,0.98)]">
              {node.label}
            </span>
          </span>
        );
      })}

      {/* Invitation, centred where the hub will appear */}
      <span
        ref={hintRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[clamp(0.62rem,1.4vh,0.78rem)] font-light tracking-[0.16em] text-white opacity-0"
        // On a narrow stage the line is too wide for the router to steer every
        // connection around, so a soft halo in the background colour keeps it
        // readable without putting a visible panel behind it.
        style={{ textShadow: "0 0 5px #000F12, 0 0 11px #000F12, 0 0 17px #000F12" }}
      >
        Tap to break your data silos
      </span>
    </button>
  );
}
