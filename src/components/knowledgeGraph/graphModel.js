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
  { id: "process", label: "Battery Line Process Flow" },
  { id: "welding", label: "Laser Welding Cell" },
  { id: "fmea", label: "Fault-to-Repair FMEA" },
  { id: "governance", label: "Product & SOP Governance" },
  { id: "full", label: "Full Factory Ontology" },
];

export const LENS_DEFAULTS = {
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
  full: {
    layers: ["uns_hierarchy", "diagnostics", "maintenance", "production_governance"],
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

const ROW = 76;
const BAND_GAP = 16;
const COL_W = CARD_W + 52;
const H_STEP = CARD_W + 20;
const H_BAND_GAP = 32;
const V_ROW = CARD_H + 56;

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
  const padX = 24;
  const padTop = 52;
  const padBottom = 24;
  const availW = Math.max(width - padX * 2, 100);
  const availH = Math.max(height - padTop - padBottom, 100);
  const k = Math.min(
    availW / Math.max(bounds.width, 1),
    availH / Math.max(bounds.height, 1),
    1.25
  );
  const safeK = Math.max(k, 0.05);
  return {
    k: safeK,
    x: padX + (availW - bounds.width * safeK) / 2 - bounds.minX * safeK,
    y: padTop + (availH - bounds.height * safeK) / 2 - bounds.minY * safeK,
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

const HIERARCHY_SPINE_ROW = {
  site: 0,
  line: 1,
  phase: 2,
  station: 3,
  machine: 4,
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

function childLevels(nodes, spineMap, fallbackLevel) {
  const edges = layoutEdges(nodes);
  const levelOf = new Map();
  const parentOf = new Map();
  const placed = new Set();
  for (const node of nodes) {
    const spine = spineMap[node.node_type];
    if (spine === undefined) continue;
    levelOf.set(node._id, spine);
    placed.add(node._id);
  }

  let pending = nodes.filter((node) => !placed.has(node._id));
  if (placed.size === 0 && pending.length > 0) {
    const minType = Math.min(...pending.map((node) => typeLevel(node.node_type)));
    for (const node of pending) {
      if (typeLevel(node.node_type) !== minType) continue;
      levelOf.set(node._id, fallbackLevel);
      placed.add(node._id);
    }
    pending = pending.filter((node) => !placed.has(node._id));
  }

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
      let parentLevel = levelOf.get(parentId);
      for (const id of neighbors) {
        const level = levelOf.get(id);
        if (level > parentLevel) {
          parentLevel = level;
          parentId = id;
        }
      }
      if (
        node.parent_id &&
        neighbors.includes(node.parent_id) &&
        levelOf.get(node.parent_id) === parentLevel
      ) {
        parentId = node.parent_id;
      }
      wave.push({ node, level: parentLevel + 1, parentId });
    }
    if (wave.length === 0) {
      const minType = Math.min(...rest.map((node) => typeLevel(node.node_type)));
      for (const node of rest) {
        if (typeLevel(node.node_type) !== minType) continue;
        levelOf.set(node._id, fallbackLevel);
        placed.add(node._id);
      }
      pending = rest.filter((node) => !placed.has(node._id));
      continue;
    }
    for (const item of wave) {
      levelOf.set(item.node._id, item.level);
      parentOf.set(item.node._id, item.parentId);
      placed.add(item.node._id);
    }
    pending = rest;
  }
  return { levelOf, parentOf };
}

export function lineLayout(nodes) {
  if (nodes.length === 0) return {};
  const byId = new Map(nodes.map((node) => [node._id, node]));
  const links = adjacency(nodes);
  const anchors = new Map();
  const { levelOf: columnOf, parentOf } = childLevels(
    nodes,
    SPINE_COLUMN,
    SPINE_COLUMN.machine + 1
  );
  const usedCols = [...new Set(columnOf.values())].sort((a, b) => a - b);
  const compactColIndex = new Map(usedCols.map((col, index) => [col, index]));
  const columnX = (column) => 28 + (compactColIndex.get(column) ?? 0) * COL_W;

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
  const stationX = columnX(stationColumn);
  const machineX = columnX(machineColumn);
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

  const looseMachines = loose.get(machineColumn) || [];
  if (looseMachines.length > 0) {
    const sorted = [...looseMachines].sort((a, b) => a.label.localeCompare(b.label));
    Object.assign(positions, placeStack(sorted, machineX, cursor));
    cursor += sorted.length * ROW + BAND_GAP;
  }

  for (const phase of nodes.filter((node) => node.node_type === "phase")) {
    const children = stations.filter((id) => byId.get(id)?.parent_id === phase._id);
    if (children.length === 0) continue;
    const tops = children.map((id) => positions[id].y);
    positions[phase._id] = {
      x: columnX(SPINE_COLUMN.phase),
      y: (Math.min(...tops) + Math.max(...tops)) / 2,
    };
  }

  const enterprise = nodes
    .filter((node) => node.node_type === "site" || node.node_type === "line")
    .sort((a, b) => (a.node_type === "site" ? -1 : 1));
  if (enterprise.length > 0) {
    const refYs =
      stations.length > 0
        ? stations.map((id) => positions[id].y)
        : Object.values(positions).map((point) => point.y);
    const mid =
      refYs.length > 0 ? (Math.min(...refYs) + Math.max(...refYs)) / 2 : 36;
    const start = mid - ((enterprise.length - 1) * ROW) / 2;
    Object.assign(
      positions,
      placeStack(enterprise, columnX(SPINE_COLUMN.site), Math.max(36, start))
    );
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
      const groups = new Map();
      for (const node of byParent(looseList)) {
        const parentId = parentOf.get(node._id) || "__loose__";
        if (!groups.has(parentId)) groups.set(parentId, []);
        groups.get(parentId).push(node);
      }
      const existingYs = Object.values(positions).map((point) => point.y);
      let fallbackY = existingYs.length > 0 ? Math.max(...existingYs) + ROW : 36;
      for (const [parentId, group] of groups) {
        const anchorY = positions[parentId]?.y ?? fallbackY;
        if (positions[parentId]?.y == null) {
          fallbackY += group.length * ROW;
        }
        stacks.push({
          nodes: group,
          x: columnX(column),
          anchorY,
        });
      }
    }
    Object.assign(positions, relaxStacks(stacks));
  }

  const ids = Object.keys(positions);
  if (ids.length > 0) {
    const minY = Math.min(...ids.map((id) => positions[id].y));
    if (minY < 36) {
      const shift = 36 - minY;
      for (const id of ids) positions[id].y += shift;
    }
  }

  return positions;
}

function placeHorizontalStack(list, startX, y) {
  const positions = {};
  list.forEach((node, index) => {
    positions[node._id] = { x: startX + index * H_STEP, y };
  });
  return positions;
}

function relaxHorizontalStacks(stacks) {
  const groups = stacks
    .filter((stack) => stack.nodes.length > 0)
    .map((stack) => ({
      nodes: stack.nodes,
      y: stack.y,
      start: stack.anchorX - ((stack.nodes.length - 1) * H_STEP) / 2,
    }))
    .sort((left, right) => left.start - right.start);
  for (let pass = 0; pass < groups.length * 3; pass += 1) {
    let moved = false;
    for (let index = 1; index < groups.length; index += 1) {
      const previous = groups[index - 1];
      const rightEdge = previous.start + previous.nodes.length * H_STEP;
      if (groups[index].start >= rightEdge) continue;
      const push = (rightEdge - groups[index].start) / 2;
      previous.start -= push;
      groups[index].start += push;
      moved = true;
    }
    if (!moved) break;
  }
  const positions = {};
  for (const group of groups) {
    Object.assign(positions, placeHorizontalStack(group.nodes, group.start, group.y));
  }
  return positions;
}

export function hierarchyLayout(nodes) {
  if (nodes.length === 0) return {};
  const byId = new Map(nodes.map((node) => [node._id, node]));
  const links = adjacency(nodes);
  const anchors = new Map();
  const { levelOf: rowOf, parentOf } = childLevels(
    nodes,
    HIERARCHY_SPINE_ROW,
    HIERARCHY_SPINE_ROW.machine + 1
  );
  const usedRows = [...new Set(rowOf.values())].sort((a, b) => a - b);
  const compactRowIndex = new Map(usedRows.map((row, index) => [row, index]));
  const rowY = (row) => 36 + (compactRowIndex.get(row) ?? 0) * V_ROW;

  const stations = LINE_STATIONS.filter((id) => byId.has(id));
  const bands = new Map(stations.map((id) => [id, new Map()]));
  const loose = new Map();

  for (const node of nodes) {
    if (["site", "line", "phase", "station"].includes(node.node_type)) continue;
    const row = rowOf.get(node._id);
    if (row === undefined) continue;
    const stationId =
      owningStation(node, byId) || anchorStation(node, byId, links, anchors);
    if (stationId && bands.has(stationId)) {
      const rows = bands.get(stationId);
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(node);
    } else {
      if (!loose.has(row)) loose.set(row, []);
      loose.get(row).push(node);
    }
  }

  const positions = {};
  const stationRow = HIERARCHY_SPINE_ROW.station;
  const machineRow = HIERARCHY_SPINE_ROW.machine;
  const byParentX = (list) =>
    [...list].sort((a, b) => {
      const parentA = positions[parentOf.get(a._id)]?.x ?? 0;
      const parentB = positions[parentOf.get(b._id)]?.x ?? 0;
      return (
        parentA - parentB ||
        typeLevel(a.node_type) - typeLevel(b.node_type) ||
        a.label.localeCompare(b.label)
      );
    });

  let cursorX = 36;
  for (const stationId of stations) {
    const machines = bands.get(stationId).get(machineRow) || [];
    const slots = Math.max(1, machines.length);
    const centerOffset = ((slots - 1) * H_STEP) / 2;
    positions[stationId] = { x: cursorX + centerOffset, y: rowY(stationRow) };
    Object.assign(positions, placeHorizontalStack(machines, cursorX, rowY(machineRow)));
    cursorX += slots * H_STEP + H_BAND_GAP;
  }

  const looseMachines = loose.get(machineRow) || [];
  if (looseMachines.length > 0) {
    const sorted = [...looseMachines].sort((a, b) => a.label.localeCompare(b.label));
    Object.assign(positions, placeHorizontalStack(sorted, cursorX, rowY(machineRow)));
    cursorX += sorted.length * H_STEP + H_BAND_GAP;
  }

  const phaseNodes = nodes.filter((node) => node.node_type === "phase");
  if (phaseNodes.length > 0) {
    const phaseStacks = [];
    let fallbackX = 36;
    for (const phase of phaseNodes) {
      const children = stations.filter((id) => byId.get(id)?.parent_id === phase._id);
      const anchorX =
        children.length > 0
          ? (Math.min(...children.map((id) => positions[id].x)) +
              Math.max(...children.map((id) => positions[id].x))) /
            2
          : fallbackX;
      fallbackX = anchorX + H_STEP;
      phaseStacks.push({ nodes: [phase], y: rowY(HIERARCHY_SPINE_ROW.phase), anchorX });
    }
    Object.assign(positions, relaxHorizontalStacks(phaseStacks));
  }

  const lineNodes = nodes.filter((node) => node.node_type === "line");
  if (lineNodes.length > 0) {
    const refXs =
      phaseNodes.length > 0
        ? phaseNodes.map((node) => positions[node._id]?.x).filter((x) => x != null)
        : Object.values(positions).map((point) => point.x);
    const centerX =
      refXs.length > 0 ? (Math.min(...refXs) + Math.max(...refXs)) / 2 : 36;
    Object.assign(
      positions,
      relaxHorizontalStacks([
        { nodes: lineNodes, y: rowY(HIERARCHY_SPINE_ROW.line), anchorX: centerX },
      ])
    );
  }

  const siteNodes = nodes.filter((node) => node.node_type === "site");
  if (siteNodes.length > 0) {
    const refXs =
      lineNodes.length > 0
        ? lineNodes.map((node) => positions[node._id]?.x).filter((x) => x != null)
        : Object.values(positions).map((point) => point.x);
    const centerX =
      refXs.length > 0 ? (Math.min(...refXs) + Math.max(...refXs)) / 2 : 36;
    Object.assign(
      positions,
      relaxHorizontalStacks([
        { nodes: siteNodes, y: rowY(HIERARCHY_SPINE_ROW.site), anchorX: centerX },
      ])
    );
  }

  const detailRows = new Set();
  for (const rows of bands.values()) {
    for (const row of rows.keys()) {
      if (row !== machineRow) detailRows.add(row);
    }
  }
  for (const row of loose.keys()) {
    if (row !== machineRow) detailRows.add(row);
  }

  for (const row of [...detailRows].sort((left, right) => left - right)) {
    const stacks = [];
    for (const stationId of stations) {
      const list = bands.get(stationId).get(row);
      if (!list || list.length === 0) continue;
      const groups = new Map();
      for (const node of byParentX(list)) {
        const parentId = parentOf.get(node._id) || stationId;
        if (!groups.has(parentId)) groups.set(parentId, []);
        groups.get(parentId).push(node);
      }
      for (const [parentId, group] of groups) {
        stacks.push({
          nodes: group,
          y: rowY(row),
          anchorX: positions[parentId]?.x ?? positions[stationId]?.x ?? 36,
        });
      }
    }
    const looseList = loose.get(row);
    if (looseList && looseList.length > 0) {
      const groups = new Map();
      for (const node of byParentX(looseList)) {
        const parentId = parentOf.get(node._id) || "__loose__";
        if (!groups.has(parentId)) groups.set(parentId, []);
        groups.get(parentId).push(node);
      }
      let fallbackX =
        Math.max(...Object.values(positions).map((point) => point.x), 36) + H_STEP;
      for (const [parentId, group] of groups) {
        const anchorX = positions[parentId]?.x ?? fallbackX;
        if (positions[parentId]?.x == null) {
          fallbackX += group.length * H_STEP;
        }
        stacks.push({
          nodes: group,
          y: rowY(row),
          anchorX,
        });
      }
    }
    Object.assign(positions, relaxHorizontalStacks(stacks));
  }

  const ids = Object.keys(positions);
  if (ids.length > 0) {
    const minX = Math.min(...ids.map((id) => positions[id].x));
    if (minX < 36) {
      const shift = 36 - minX;
      for (const id of ids) positions[id].x += shift;
    }
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
  let disconnectedRing = null;
  for (const node of nodes) {
    if (rank.has(node._id)) continue;
    if (disconnectedRing == null) {
      maxRank += 1;
      disconnectedRing = maxRank;
    }
    rank.set(node._id, disconnectedRing);
  }

  const rings = new Map();
  for (const node of nodes) {
    const ring = rank.get(node._id);
    if (!rings.has(ring)) rings.set(ring, []);
    rings.get(ring).push(node._id);
  }

  const positions = {};
  const aspectY = 0.68;
  const ringStepX = CARD_W * 0.78;
  const ringStepY = CARD_H + 44;
  let rx = 0;
  let ry = 0;
  for (const ring of [...rings.keys()].sort((a, b) => a - b)) {
    const ids = rings.get(ring);
    if (ring === 0 && ids.length === 1) {
      positions[ids[0]] = { x: -CARD_W / 2, y: -CARD_H / 2 };
      rx = CARD_W * 0.85;
      ry = CARD_H + 40;
      continue;
    }
    const avgFootprint = (CARD_W + CARD_H) / 2 + 12;
    const neededRx = (ids.length * avgFootprint) / (2 * Math.PI * ((1 + aspectY) / 2));
    rx = Math.max(rx, neededRx);
    ry = Math.max(ry, rx * aspectY);
    ids.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index / ids.length) * Math.PI * 2;
      positions[id] = {
        x: Math.cos(angle) * rx - CARD_W / 2,
        y: Math.sin(angle) * ry - CARD_H / 2,
      };
    });
    rx += ringStepX;
    ry += ringStepY;
  }

  const pad = 12;
  const ids = Object.keys(positions);
  for (let iteration = 0; iteration < 140; iteration += 1) {
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
    positions[id].x += 24 - minX;
    positions[id].y += 24 - minY;
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
  const bend = Math.min(28, distance * 0.14);
  const controlX = midX + (-dy / distance) * bend;
  const controlY = midY + (dx / distance) * bend;
  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`,
    labelX: controlX,
    labelY: controlY,
  };
}

export function hierarchyEdgeGeometry(source, target) {
  const sameRow = Math.abs(source.y - target.y) < 24;
  if (sameRow) {
    const fromLeft = source.x < target.x;
    const x1 = fromLeft ? source.x + CARD_W : source.x;
    const x2 = fromLeft ? target.x : target.x + CARD_W;
    const y = source.y + CARD_H / 2;
    const span = Math.abs(x2 - x1);
    const bend = span > 80 ? source.y - 18 : y - 14;
    return {
      path: `M ${x1} ${y} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${y}`,
      labelX: (x1 + x2) / 2,
      labelY: bend - 4,
    };
  }
  const downward = target.y >= source.y;
  const x1 = source.x + CARD_W / 2;
  const x2 = target.x + CARD_W / 2;
  const y1 = downward ? source.y + CARD_H : source.y;
  const y2 = downward ? target.y : target.y + CARD_H;
  const mid = (y1 + y2) / 2;
  return {
    path: `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`,
    labelX: (x1 + x2) / 2,
    labelY: mid - 6,
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
