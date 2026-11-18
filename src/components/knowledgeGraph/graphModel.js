export const CARD_W = 188;
export const CARD_H = 64;

export const LAYERS = [
  {
    id: "uns_hierarchy",
    label: "UNS Hierarchy",
    color: "#00684A",
    tint: "#E3FCF7",
    border: "#B8E4D2",
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    color: "#944F01",
    tint: "#FEF7DB",
    border: "#EBCB9B",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    color: "#0C4A6E",
    tint: "#E7F4FB",
    border: "#B9D7E8",
  },
  {
    id: "production_governance",
    label: "Governance",
    color: "#5B3A8C",
    tint: "#F4EEFB",
    border: "#D9C8EE",
  },
];

export const LENSES = [
  { id: "full", label: "Full Factory Ontology" },
  { id: "welding", label: "Laser Welding Cell" },
  { id: "process", label: "Battery Line Process Flow" },
  { id: "fmea", label: "Fault-to-Repair FMEA" },
  { id: "governance", label: "Product & SOP Governance" },
];

export const LENS_DEFAULTS = {
  full: { layers: ["uns_hierarchy"], depth: 5 },
  process: { layers: ["uns_hierarchy"], depth: 5 },
  welding: {
    layers: ["uns_hierarchy", "diagnostics", "maintenance", "production_governance"],
    depth: 15,
  },
  fmea: {
    layers: ["uns_hierarchy", "diagnostics", "maintenance"],
    depth: 12,
  },
  governance: {
    layers: ["uns_hierarchy", "production_governance"],
    depth: 15,
  },
};

const LINE_STATIONS = [
  "station:cell-screening",
  "station:tab-processing",
  "station:z-fold",
  "station:module-assembly",
  "station:laser-welding",
  "station:ultrasonic-welding",
  "station:weld-monitoring",
  "station:cooling-plate",
  "station:pouch-sealing",
  "station:helium-test",
  "station:eol-test",
];

const COLUMNS = [
  ["site", "line"],
  ["phase"],
  ["station"],
  ["machine"],
  ["subsystem"],
  ["sensor"],
  ["alarm"],
  ["failure"],
  ["part"],
  ["manual"],
  ["skill"],
  ["product"],
  ["material"],
  ["sop"],
];

const ROW = 76;
const BAND_GAP = 16;
const COL_W = CARD_W + 52;

export const NODE_TYPES = [
  { id: "site", label: "Site", glyph: "Building" },
  { id: "line", label: "Production line", glyph: "Connect" },
  { id: "phase", label: "Process step", glyph: "NumberedList" },
  { id: "station", label: "Station", glyph: "Pin" },
  { id: "machine", label: "Machine", glyph: "Wrench" },
  { id: "subsystem", label: "Subsystem", glyph: "Settings" },
  { id: "sensor", label: "Sensor", glyph: "Gauge" },
  { id: "alarm", label: "Alarm", glyph: "Bell" },
  { id: "failure", label: "Failure", glyph: "Warning" },
  { id: "part", label: "Part", glyph: "Package" },
  { id: "manual", label: "Manual", glyph: "Guide" },
  { id: "skill", label: "Skill", glyph: "Person" },
  { id: "product", label: "Product", glyph: "AllProducts" },
  { id: "material", label: "Material", glyph: "Beaker" },
  { id: "sop", label: "Procedure", glyph: "Shield" },
];

export const HIERARCHY_LEVELS = NODE_TYPES.map((type, index) => ({
  level: index + 1,
  ...type,
}));

export const DEFAULT_DEPTH = 5;

export function typeLevel(nodeType) {
  const found = HIERARCHY_LEVELS.find((level) => level.id === nodeType);
  return found ? found.level : HIERARCHY_LEVELS.length;
}

export function directNeighbors(nodeId, nodes, edges) {
  const ids = new Set();
  for (const node of nodes) {
    if (node._id === nodeId) {
      if (node.parent_id) ids.add(node.parent_id);
    } else if (node.parent_id === nodeId) {
      ids.add(node._id);
    }
  }
  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }
  ids.delete(nodeId);
  return [...ids];
}

export function hierarchyChildren(nodeId, nodes, edges) {
  return directNeighbors(nodeId, nodes, edges);
}

export function expandedView(nodes, edges, expandedIds) {
  const visible = new Set();
  for (const id of expandedIds) {
    visible.add(id);
    for (const neighborId of directNeighbors(id, nodes, edges)) {
      visible.add(neighborId);
    }
  }
  return visible;
}

export function nodesWithinDepth(nodes, edges, depth, expandedIds) {
  const visible = new Set(
    nodes
      .filter((node) => typeLevel(node.node_type) <= depth)
      .map((node) => node._id)
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...visible]) {
      if (!expandedIds.has(id)) continue;
      for (const childId of hierarchyChildren(id, nodes, edges)) {
        if (visible.has(childId)) continue;
        visible.add(childId);
        grew = true;
      }
    }
  }
  return visible;
}

export const BACKBONE_RELS = new Set([
  "OPERATES",
  "CONTAINS",
  "FEEDS_INTO",
  "OPERATED_BY",
  "MONITORED_BY",
  "MONITORS",
  "OBSERVED_BY",
  "PUBLISHES_TO",
  "MEASURED_BY",
  "RAISES",
  "RELEASES",
  "USES",
  "REQUIRES_SKILL",
  "GOVERNED_BY",
  "GOVERNS",
]);

export function layerStyle(layerId) {
  return LAYERS.find((layer) => layer.id === layerId) || LAYERS[0];
}

function ancestors(node, byId) {
  const chain = [];
  let current = node;
  const guard = new Set();
  while (current?.parent_id && !guard.has(current._id)) {
    guard.add(current._id);
    chain.push(current.parent_id);
    current = byId.get(current.parent_id);
  }
  return chain;
}

export function lensNodeIds(lensId, nodes, edges) {
  if (lensId === "process") {
    return new Set(
      nodes
        .filter((node) =>
          ["site", "line", "phase", "station", "machine"].includes(node.node_type)
        )
        .map((node) => node._id)
    );
  }
  if (lensId === "fmea") {
    return new Set(
      nodes
        .filter(
          (node) =>
            node.layer === "diagnostics" ||
            node.layer === "maintenance" ||
            node.node_type === "machine"
        )
        .map((node) => node._id)
    );
  }
  if (lensId === "governance") {
    return new Set(
      nodes
        .filter(
          (node) =>
            node.layer === "production_governance" ||
            ["machine", "station", "line"].includes(node.node_type)
        )
        .map((node) => node._id)
    );
  }
  if (lensId === "welding") {
    const byId = new Map(nodes.map((node) => [node._id, node]));
    const seed = new Set(["station:laser-welding"]);
    for (const node of nodes) {
      if (ancestors(node, byId).includes("station:laser-welding")) {
        seed.add(node._id);
      }
    }
    const extraTypes = new Set([
      "skill",
      "manual",
      "material",
      "product",
      "sop",
      "station",
    ]);
    const ids = new Set(seed);
    for (const edge of edges) {
      const target = byId.get(edge.target);
      const source = byId.get(edge.source);
      if (seed.has(edge.source) && extraTypes.has(target?.node_type)) {
        ids.add(edge.target);
      }
      if (seed.has(edge.target) && extraTypes.has(source?.node_type)) {
        ids.add(edge.source);
      }
    }
    return ids;
  }
  return new Set(nodes.map((node) => node._id));
}

export function neighborhoodIds(nodeId, edges) {
  const ids = new Set([nodeId]);
  if (!nodeId) return ids;
  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }
  return ids;
}

function boundsOf(positions) {
  const points = Object.values(positions);
  if (points.length === 0) {
    return { minX: 0, minY: 0, width: CARD_W, height: CARD_H };
  }
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x + CARD_W));
  const maxY = Math.max(...points.map((point) => point.y + CARD_H));
  return { minX, minY, width: Math.max(maxX - minX, CARD_W), height: Math.max(maxY - minY, CARD_H) };
}

export function fitTransform(positions, viewport) {
  const bounds = boundsOf(positions);
  const width = viewport?.w || 800;
  const height = viewport?.h || 600;
  const k = Math.min(
    (width - 48) / (bounds.width + 32),
    (height - 48) / (bounds.height + 32),
    1.25
  );
  const safeK = Math.max(k, 0.28);
  return {
    k: safeK,
    x: (width - bounds.width * safeK) / 2 - bounds.minX * safeK,
    y: (height - bounds.height * safeK) / 2 - bounds.minY * safeK,
  };
}

function owningStation(node, byId) {
  let current = node;
  const guard = new Set();
  while (current && !guard.has(current._id)) {
    guard.add(current._id);
    if (current.node_type === "station") return current._id;
    current = byId.get(current.parent_id);
  }
  return null;
}

export function edgeRole(edge, byId, highlightIds) {
  if (
    highlightIds &&
    highlightIds.has(edge.source) &&
    highlightIds.has(edge.target)
  ) {
    return "hot";
  }
  if (BACKBONE_RELS.has(edge.rel)) return "line";
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  const sourceStation = source ? owningStation(source, byId) : null;
  const targetStation = target ? owningStation(target, byId) : null;
  if (sourceStation && sourceStation === targetStation) return "line";
  return null;
}

function placeStack(list, x, startY) {
  const positions = {};
  list.forEach((node, index) => {
    positions[node._id] = { x, y: startY + index * ROW };
  });
  return positions;
}

function relaxStacks(stacks) {
  const groups = stacks
    .filter((stack) => stack.nodes.length > 0)
    .map((stack) => ({
      nodes: stack.nodes,
      x: stack.x,
      start: stack.anchorY - ((stack.nodes.length - 1) * ROW) / 2,
    }))
    .sort((left, right) => left.start - right.start);
  for (let pass = 0; pass < groups.length * 3; pass += 1) {
    let moved = false;
    for (let index = 1; index < groups.length; index += 1) {
      const previous = groups[index - 1];
      const floor = previous.start + previous.nodes.length * ROW;
      if (groups[index].start >= floor) continue;
      const push = (floor - groups[index].start) / 2;
      previous.start -= push;
      groups[index].start += push;
      moved = true;
    }
    if (!moved) break;
  }
  const positions = {};
  for (const group of groups) {
    Object.assign(positions, placeStack(group.nodes, group.x, group.start));
  }
  return positions;
}

function adjacency(nodes) {
  const links = new Map(nodes.map((node) => [node._id, []]));
  for (const node of nodes) {
    for (const edge of node.edges || []) {
      if (!links.has(edge.target)) continue;
      links.get(node._id).push(edge.target);
      links.get(edge.target).push(node._id);
    }
  }
  return links;
}

function anchorStation(node, byId, links, memo) {
  if (memo.has(node._id)) return memo.get(node._id);
  const owned = owningStation(node, byId);
  if (owned) {
    memo.set(node._id, owned);
    return owned;
  }
  memo.set(node._id, null);
  const counts = new Map();
  for (const neighborId of links.get(node._id) || []) {
    const neighbor = byId.get(neighborId);
    if (!neighbor) continue;
    const station =
      owningStation(neighbor, byId) || anchorStation(neighbor, byId, links, memo);
    if (!station) continue;
    counts.set(station, (counts.get(station) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [station, count] of counts) {
    if (count > bestCount) {
      best = station;
      bestCount = count;
    }
  }
  memo.set(node._id, best);
  return best;
}

const SPINE_COLUMN = {
  site: 0,
  line: 0,
  phase: 1,
  station: 2,
  machine: 3,
};

function layoutEdges(nodes) {
  const ids = new Set(nodes.map((node) => node._id));
  const edges = [];
  for (const node of nodes) {
    for (const edge of node.edges || []) {
      if (!ids.has(edge.target)) continue;
      edges.push({ source: node._id, target: edge.target });
    }
  }
  return edges;
}

function childColumns(nodes) {
  const edges = layoutEdges(nodes);
  const columnOf = new Map();
  const parentOf = new Map();
  const placed = new Set();
  for (const node of nodes) {
    const spine = SPINE_COLUMN[node.node_type];
    if (spine === undefined) continue;
    columnOf.set(node._id, spine);
    placed.add(node._id);
  }

  let pending = nodes.filter((node) => !placed.has(node._id));
  let guard = 0;
  while (pending.length > 0 && guard <= nodes.length) {
    guard += 1;
    const wave = [];
    const rest = [];
    for (const node of pending) {
      const neighbors = directNeighbors(node._id, nodes, edges).filter((id) => placed.has(id));
      if (neighbors.length === 0) {
        rest.push(node);
        continue;
      }
      let parentId = neighbors[0];
      let parentColumn = columnOf.get(parentId);
      for (const id of neighbors) {
        const column = columnOf.get(id);
        if (column > parentColumn) {
          parentColumn = column;
          parentId = id;
        }
      }
      if (
        node.parent_id &&
        neighbors.includes(node.parent_id) &&
        columnOf.get(node.parent_id) === parentColumn
      ) {
        parentId = node.parent_id;
      }
      wave.push({ node, column: parentColumn + 1, parentId });
    }
    if (wave.length === 0) break;
    for (const item of wave) {
      columnOf.set(item.node._id, item.column);
      parentOf.set(item.node._id, item.parentId);
      placed.add(item.node._id);
    }
    pending = rest;
  }
  for (const node of pending) columnOf.set(node._id, SPINE_COLUMN.machine + 1);
  return { columnOf, parentOf };
}

export function lineLayout(nodes) {
  const byId = new Map(nodes.map((node) => [node._id, node]));
  const links = adjacency(nodes);
  const anchors = new Map();
  const { columnOf, parentOf } = childColumns(nodes);
  const stations = LINE_STATIONS.filter((id) => byId.has(id));
  const bands = new Map(stations.map((id) => [id, new Map()]));
  const loose = new Map();

  for (const node of nodes) {
    if (["site", "line", "phase", "station"].includes(node.node_type)) continue;
    const column = columnOf.get(node._id);
    if (column === undefined) continue;
    const stationId =
      owningStation(node, byId) || anchorStation(node, byId, links, anchors);
    if (stationId && bands.has(stationId)) {
      const columns = bands.get(stationId);
      if (!columns.has(column)) columns.set(column, []);
      columns.get(column).push(node);
    } else {
      if (!loose.has(column)) loose.set(column, []);
      loose.get(column).push(node);
    }
  }

  const positions = {};
  const stationColumn = SPINE_COLUMN.station;
  const machineColumn = SPINE_COLUMN.machine;
  const stationX = 28 + stationColumn * COL_W;
  const machineX = 28 + machineColumn * COL_W;
  const columnX = (column) => 28 + column * COL_W;
  const byParent = (list) =>
    [...list].sort((a, b) => {
      const parentA = positions[parentOf.get(a._id)]?.y ?? 0;
      const parentB = positions[parentOf.get(b._id)]?.y ?? 0;
      return (
        parentA - parentB ||
        typeLevel(a.node_type) - typeLevel(b.node_type) ||
        a.label.localeCompare(b.label)
      );
    });

  let cursor = 36;
  for (const stationId of stations) {
    const machines = bands.get(stationId).get(machineColumn) || [];
    const rows = Math.max(1, machines.length);
    positions[stationId] = { x: stationX, y: cursor };
    Object.assign(positions, placeStack(machines, machineX, cursor));
    cursor += rows * ROW + BAND_GAP;
  }

  const phaseColumn = COLUMNS.findIndex((types) => types.includes("phase"));
  for (const phase of nodes.filter((node) => node.node_type === "phase")) {
    const children = stations.filter((id) => byId.get(id)?.parent_id === phase._id);
    if (children.length === 0) continue;
    const tops = children.map((id) => positions[id].y);
    positions[phase._id] = {
      x: 28 + phaseColumn * COL_W,
      y: (Math.min(...tops) + Math.max(...tops)) / 2,
    };
  }

  const enterprise = nodes
    .filter((node) => node.node_type === "site" || node.node_type === "line")
    .sort((a, b) => (a.node_type === "site" ? -1 : 1));
  if (enterprise.length > 0 && stations.length > 0) {
    const tops = stations.map((id) => positions[id].y);
    const mid = (Math.min(...tops) + Math.max(...tops)) / 2;
    const start = mid - ((enterprise.length - 1) * ROW) / 2;
    Object.assign(positions, placeStack(enterprise, 28, Math.max(36, start)));
  }

  const detailColumns = new Set();
  for (const columns of bands.values()) {
    for (const column of columns.keys()) {
      if (column !== machineColumn) detailColumns.add(column);
    }
  }
  for (const column of loose.keys()) {
    if (column !== machineColumn) detailColumns.add(column);
  }

  for (const column of [...detailColumns].sort((left, right) => left - right)) {
    const stacks = [];
    for (const stationId of stations) {
      const list = bands.get(stationId).get(column);
      if (!list || list.length === 0) continue;
      const groups = new Map();
      for (const node of byParent(list)) {
        const parentId = parentOf.get(node._id) || stationId;
        if (!groups.has(parentId)) groups.set(parentId, []);
        groups.get(parentId).push(node);
      }
      for (const [parentId, group] of groups) {
        stacks.push({
          nodes: group,
          x: columnX(column),
          anchorY: positions[parentId]?.y ?? positions[stationId]?.y ?? 36,
        });
      }
    }
    const looseList = loose.get(column);
    if (looseList && looseList.length > 0) {
      const lowest = Math.max(...Object.values(positions).map((point) => point.y), 36);
      stacks.push({
        nodes: byParent(looseList),
        x: columnX(column),
        anchorY: lowest + ROW,
      });
    }
    Object.assign(positions, relaxStacks(stacks));
  }

  return positions;
}

export function networkLayout(nodes) {
  if (nodes.length === 0) return {};
  const byId = new Map(nodes.map((node) => [node._id, node]));
  const neighbors = new Map(nodes.map((node) => [node._id, []]));
  for (const node of nodes) {
    for (const edge of node.edges || []) {
      if (!byId.has(edge.target)) continue;
      neighbors.get(node._id).push(edge.target);
      neighbors.get(edge.target).push(node._id);
    }
  }

  const root = nodes.find((node) => node.node_type === "site") || nodes[0];
  const rank = new Map([[root._id, 0]]);
  const queue = [root._id];
  while (queue.length > 0) {
    const id = queue.shift();
    const nextIds = [...new Set(neighbors.get(id) || [])].sort((left, right) => {
      const leftNode = byId.get(left);
      const rightNode = byId.get(right);
      return (
        typeLevel(leftNode.node_type) - typeLevel(rightNode.node_type) ||
        leftNode.label.localeCompare(rightNode.label)
      );
    });
    for (const nextId of nextIds) {
      if (rank.has(nextId)) continue;
      rank.set(nextId, rank.get(id) + 1);
      queue.push(nextId);
    }
  }
  let maxRank = Math.max(...rank.values());
  for (const node of nodes) {
    if (rank.has(node._id)) continue;
    maxRank += 1;
    rank.set(node._id, maxRank);
  }

  const rings = new Map();
  for (const node of nodes) {
    const ring = rank.get(node._id);
    if (!rings.has(ring)) rings.set(ring, []);
    rings.get(ring).push(node._id);
  }

  const positions = {};
  let radius = 0;
  for (const ring of [...rings.keys()].sort((a, b) => a - b)) {
    const ids = rings.get(ring);
    if (ring === 0 && ids.length === 1) {
      positions[ids[0]] = { x: -CARD_W / 2, y: -CARD_H / 2 };
      radius = Math.max(CARD_W + 48, CARD_H + 72);
      continue;
    }
    const needed = (ids.length * (CARD_W + 36)) / (2 * Math.PI);
    radius = Math.max(radius, needed);
    ids.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index / ids.length) * Math.PI * 2;
      positions[id] = {
        x: Math.cos(angle) * radius - CARD_W / 2,
        y: Math.sin(angle) * radius - CARD_H / 2,
      };
    });
    radius += Math.max(CARD_W + 56, CARD_H + 88);
  }

  const pad = 20;
  const ids = Object.keys(positions);
  for (let iteration = 0; iteration < 120; iteration += 1) {
    let moved = false;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = positions[ids[i]];
        const b = positions[ids[j]];
        const overlapX = CARD_W + pad - Math.abs(a.x - b.x);
        const overlapY = CARD_H + pad - Math.abs(a.y - b.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 1;
          const direction = a.x <= b.x ? -1 : 1;
          a.x += direction * push;
          b.x -= direction * push;
        } else {
          const push = overlapY / 2 + 1;
          const direction = a.y <= b.y ? -1 : 1;
          a.y += direction * push;
          b.y -= direction * push;
        }
      }
    }
    if (!moved) break;
  }

  const minX = Math.min(...ids.map((id) => positions[id].x));
  const minY = Math.min(...ids.map((id) => positions[id].y));
  for (const id of ids) {
    positions[id].x += 40 - minX;
    positions[id].y += 40 - minY;
  }
  return positions;
}

export function networkEdgeGeometry(source, target) {
  const x1 = source.x + CARD_W / 2;
  const y1 = source.y + CARD_H / 2;
  const x2 = target.x + CARD_W / 2;
  const y2 = target.y + CARD_H / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy) || 1;
  const startX = x1 + (dx / distance) * (CARD_W * 0.42);
  const startY = y1 + (dy / distance) * (CARD_H * 0.42);
  const endX = x2 - (dx / distance) * (CARD_W * 0.46);
  const endY = y2 - (dy / distance) * (CARD_H * 0.46);
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const bend = Math.min(42, distance * 0.18);
  const controlX = midX + (-dy / distance) * bend;
  const controlY = midY + (dx / distance) * bend;
  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`,
    labelX: controlX,
    labelY: controlY,
  };
}

export function edgeGeometry(source, target) {
  const sameColumn = Math.abs(source.x - target.x) < 24;
  if (sameColumn) {
    const fromAbove = source.y < target.y;
    const y1 = fromAbove ? source.y + CARD_H : source.y;
    const y2 = fromAbove ? target.y : target.y + CARD_H;
    const x = source.x + CARD_W / 2;
    const bend = x + 18;
    return {
      path: `M ${x} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x} ${y2}`,
      labelX: bend + 8,
      labelY: (y1 + y2) / 2,
    };
  }
  const forward = target.x >= source.x;
  const x1 = forward ? source.x + CARD_W : source.x;
  const x2 = forward ? target.x : target.x + CARD_W;
  const y1 = source.y + CARD_H / 2;
  const y2 = target.y + CARD_H / 2;
  const mid = (x1 + x2) / 2;
  return {
    path: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
    labelX: mid,
    labelY: (y1 + y2) / 2 - 8,
  };
}
