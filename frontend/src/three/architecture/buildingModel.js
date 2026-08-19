// ---------------------------------------------------------------------------
// buildingModel.js
//
// The architectural Intermediate Representation (IR) for Arch-3D.
//
// This is the structured replacement for the old "modelSpec.parts" flat
// array of disconnected boxes. Nothing in this file touches Three.js — it
// is pure data + factory/normalisation helpers. Geometry generators
// (wallSystem, roofSystem, stairSystem, geometryBuilder, ...) consume this
// shape; the AI layer (backend/services/aiService.js) should ultimately
// produce a DesignBrief that designBriefToBuilding.js turns into this shape,
// or — for blueprint input — a vision pipeline that fills it directly.
//
// Shape overview:
//
// Building
//  ├─ site            { boundary, setbacks: {front,rear,left,right} }
//  ├─ metadata         { title, style, bedrooms, ... free-form }
//  ├─ levels[]
//  │    ├─ index        (1 = ground floor, 2 = first floor, ...)
//  │    ├─ elevation     absolute Y of this level's finished floor
//  │    ├─ height        floor-to-floor / ceiling height
//  │    ├─ footprint      [[x,z], ...] polygon, CCW, in building-local coords
//  │    ├─ walls[]         see createWall()
//  │    ├─ rooms[]         see createRoom()
//  │    └─ balconies[]     [{ polygon, railingHeight, floor }]
//  ├─ stairs[]         see createStair()
//  ├─ roof             see createRoof() — always describes the TOP level's roof
//  └─ exterior         { compoundWall, gate, porch, canopy, paving, garage }
//
// Coordinate system: X = width (left/right), Z = depth (front/back),
// Y = up. Footprints/room polygons are arrays of [x, z] pairs.
// ---------------------------------------------------------------------------

let _idCounter = 0;
export function nextId(prefix = 'id') {
  _idCounter += 1;
  return `${prefix}_${_idCounter.toString(36)}`;
}

// --- Walls -------------------------------------------------------------

// A wall is a real segment, not a box. Its 3D geometry is derived from
// start/end/thickness/height/baseElevation by wallSystem.js. Openings are
// attached to the wall itself (offsetAlongWall from `start`), not placed
// independently in world space, so a window always stays embedded in its
// wall by construction.
export function createWall({
  id, start, end, thickness = 0.2, height = 3.0, baseElevation = 0,
  type = 'exterior', // 'exterior' | 'interior' | 'parapet' | 'compound'
  material = 'plaster', color, floor = 1, rooms = [], roomSpans = [], openings = [],
} = {}) {
  return {
    id: id || nextId('wall'),
    start, end, thickness, height, baseElevation,
    type, material, color, floor,
    rooms, // [roomId...] every room this wall borders — filled by the room generator
    // roomSpans: [{ room, from, to }] — the along-wall distance range (from
    // wall.start, in the same units as offsetAlongWall) that belongs to
    // each room, for walls shared by more than one room (two rooms sitting
    // side by side against the same exterior line merge into one
    // continuous wall — this is what lets a window center on ITS room's
    // stretch of that wall instead of the whole merged wall's midpoint).
    roomSpans,
    openings: openings.map((o) => normalizeOpening(o)),
  };
}

export function addOpening(wall, opening) {
  const o = normalizeOpening(opening);
  wall.openings.push(o);
  return o;
}

function normalizeOpening(o = {}) {
  const type = o.type || 'window';
  return {
    id: o.id || nextId(type),
    type, // 'window' | 'door' | 'sliding-door' | 'garage-door' | 'french-door'
    offsetAlongWall: o.offsetAlongWall ?? 0, // distance from wall.start, metres
    width: o.width ?? (type === 'door' ? 0.9 : 1.2),
    height: o.height ?? (type === 'door' ? 2.1 : 1.2),
    sillHeight: type.includes('door') ? 0 : (o.sillHeight ?? 0.9),
    style: o.style || (type.includes('door') ? 'hinged' : 'casement'),
    swing: o.swing || 'right', // hinge side for doors
    mullions: o.mullions ?? (type === 'window'),
    room: o.room || null,
  };
}

export function wallVector(wall) {
  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[1] - wall.start[1];
  return [dx, dz];
}
export function wallLength(wall) {
  const [dx, dz] = wallVector(wall);
  return Math.hypot(dx, dz);
}
export function wallAngle(wall) {
  const [dx, dz] = wallVector(wall);
  return Math.atan2(dx, dz); // radians, matches Three.js rotation.y convention used elsewhere in the app
}
export function wallMidpoint(wall) {
  return [(wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2];
}
// World-space point at a given distance along the wall + lateral offset
// (positive lateral = to the right when walking start→end). Used to place
// opening cutouts, and reusable by callers that need exact opening centres.
export function pointAlongWall(wall, distance, lateral = 0) {
  const len = wallLength(wall) || 1;
  const [dx, dz] = wallVector(wall);
  const ux = dx / len, uz = dz / len; // forward unit vector
  const nx = uz, nz = -ux; // right-hand normal
  return [
    wall.start[0] + ux * distance + nx * lateral,
    wall.start[1] + uz * distance + nz * lateral,
  ];
}

// --- Rooms ---------------------------------------------------------------

export function createRoom({ id, name, type = 'generic', floor = 1, polygon, ceilingHeight } = {}) {
  return { id: id || nextId('room'), name, type, floor, polygon, ceilingHeight };
}

export function roomArea(room) {
  const pts = room.polygon;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    area += x1 * z2 - x2 * z1;
  }
  return Math.abs(area) / 2;
}

// --- Levels ----------------------------------------------------------------

export function createLevel({
  id, index, elevation, height = 3.0, footprint,
  walls = [], rooms = [], balconies = [], terraces = [], components = [],
} = {}) {
  return { id: id || nextId('level'), index, elevation, height, footprint, walls, rooms, balconies, terraces, components };
}

// --- Stairs ------------------------------------------------------------

export function createStair({
  id, fromFloor, toFloor, type = 'straight', // 'straight' | 'l-shaped' | 'u-shaped'
  position, rotation = 0, width = 1.0, riserHeight = 0.18, treadDepth = 0.28,
} = {}) {
  return { id: id || nextId('stair'), fromFloor, toFloor, type, position, rotation, width, riserHeight, treadDepth };
}

// --- Roof ------------------------------------------------------------------

export function createRoof({
  type = 'hip', // 'hip' | 'gable' | 'flat' | 'mono' | 'parapet'
  pitchDeg = 24, overhang = 0.5, parapetHeight = 0.9, ridgeAxis = 'auto',
  material = 'metal', color,
} = {}) {
  return { type, pitchDeg, overhang, parapetHeight, ridgeAxis, material, color };
}

// --- Building ----------------------------------------------------------

export function createBuilding({
  id, name = 'Building', site = {}, levels = [], stairs = [], roof, exterior = {}, systems = {}, metadata = {}, documentation = {}, structural = {}, datums = {}, parametric = {},
} = {}) {
  return {
    id: id || nextId('bldg'),
    name,
    site: { boundary: null, setbacks: { front: 3, rear: 3, left: 1.5, right: 1.5 }, road: { width: 5, z: null }, drainage: { strategy: 'site-drainage-intent' }, ...site },
    levels,
    stairs,
    roof: roof || createRoof(),
    exterior: { compoundWall: false, gate: false, porch: false, canopy: false, paving: true, garage: null, ...exterior },
    systems: { electrical: { routes: [] }, plumbing: { routes: [] }, drainage: { routes: [] }, hvac: { routes: [] }, fire: { routes: [] }, ...systems },
    metadata,
    documentation: { dimensions: [], notes: [], grids: [], views: [], tags: [], ...documentation },
    datums: { levels: [], grids: [], ...datums },
    parametric: { wallAssemblies: {}, openingFamilies: {}, constraints: [], ...parametric },
    structural: { strategy: 'reinforced-concrete-design-intent', ...structural },
  };
}

// Fills in anything left implicit (elevations from heights, ids, sorted
// level order) so downstream generators never have to guard against
// missing fields. Always run a building through this before rendering.
export function normalizeBuilding(building = {}) {
  // AI/legacy routes can hand the renderer partially-shaped data. Normalize
  // it at the boundary so every downstream geometry phase receives finite
  // coordinate arrays instead of throwing on expressions such as p[0].
  const source = building && typeof building === 'object' ? building : {};
  const finitePair = (p, fallback = [0, 0]) => {
    if (!Array.isArray(p) || p.length < 2) return [...fallback];
    const x = Number(p[0]), z = Number(p[1]);
    return Number.isFinite(x) && Number.isFinite(z) ? [x, z] : [...fallback];
  };
  const cleanPolygon = (poly, fallback = null) => {
    if (!Array.isArray(poly)) return fallback ? fallback.map(finitePair) : null;
    const out = poly.map(p => finitePair(p, [NaN, NaN])).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    return out.length >= 3 ? out : (fallback ? fallback.map(finitePair) : null);
  };
  const defaultFootprint = [[-6, -5], [6, -5], [6, 5], [-6, 5]];
  const levelsInput = Array.isArray(source.levels) ? source.levels : [];
  const levels = levelsInput.map((raw, index) => {
    const level = raw && typeof raw === 'object' ? raw : {};
    const height = Number.isFinite(Number(level.height)) && Number(level.height) > 0 ? Number(level.height) : 3;
    const indexValue = Number.isFinite(Number(level.index)) ? Number(level.index) : index + 1;
    const elevation = Number.isFinite(Number(level.elevation)) ? Number(level.elevation) : null;
    let footprint = cleanPolygon(level.footprint);
    const rawWalls = Array.isArray(level.walls) ? level.walls : [];
    if (!footprint) {
      const pts = rawWalls.flatMap(w => [w?.start, w?.end]).filter(Array.isArray).map(p => finitePair(p, [NaN, NaN])).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (pts.length >= 3) {
        const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
        footprint = [[Math.min(...xs), Math.min(...zs)], [Math.max(...xs), Math.min(...zs)], [Math.max(...xs), Math.max(...zs)], [Math.min(...xs), Math.max(...zs)]];
      } else footprint = defaultFootprint.map(p => [...p]);
    }
    const walls = rawWalls.map((rawWall, wi) => {
      const w = rawWall && typeof rawWall === 'object' ? rawWall : {};
      const start = finitePair(w.start, footprint[0]);
      const end = finitePair(w.end, footprint[1]);
      const thickness = Number.isFinite(Number(w.thickness)) && Number(w.thickness) > 0 ? Number(w.thickness) : (w.type === 'interior' ? 0.12 : 0.2);
      const wallHeight = Number.isFinite(Number(w.height)) && Number(w.height) > 0 ? Number(w.height) : height;
      const openings = Array.isArray(w.openings) ? w.openings.map(o => normalizeOpening(o || {})).filter(o => Number.isFinite(o.width) && Number.isFinite(o.height) && o.width > 0 && o.height > 0) : [];
      return {
        ...w,
        id: w.id || nextId('wall'), start, end, thickness, height: wallHeight,
        baseElevation: Number.isFinite(Number(w.baseElevation)) ? Number(w.baseElevation) : (elevation ?? 0),
        type: w.type || 'exterior', material: w.material || 'plaster', floor: indexValue,
        rooms: Array.isArray(w.rooms) ? w.rooms.filter(Boolean) : [],
        roomSpans: Array.isArray(w.roomSpans) ? w.roomSpans.filter(Boolean) : [], openings,
      };
    }).filter(w => Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]) > 0.03);
    const rooms = (Array.isArray(level.rooms) ? level.rooms : []).map((rawRoom, ri) => {
      const r = rawRoom && typeof rawRoom === 'object' ? rawRoom : {};
      const polygon = cleanPolygon(r.polygon);
      if (!polygon) return null;
      return { ...r, id: r.id || nextId('room'), name: r.name || `Room ${ri + 1}`, type: r.type || 'generic', floor: indexValue, polygon, ceilingHeight: Number.isFinite(Number(r.ceilingHeight)) ? Number(r.ceilingHeight) : height - 0.05 };
    }).filter(Boolean);
    const components = (Array.isArray(level.components) ? level.components : []).map((c, ci) => {
      if (!c || typeof c !== 'object') return null;
      const position = Array.isArray(c.position) && c.position.length >= 3 ? [Number(c.position[0]), Number(c.position[1]), Number(c.position[2])] : [0, (elevation ?? 0) + 0.5, 0];
      const size = Array.isArray(c.size) && c.size.length >= 3 ? [Number(c.size[0]), Number(c.size[1]), Number(c.size[2])] : [0.5, 0.5, 0.5];
      if (![...position, ...size].every(Number.isFinite)) return null;
      return { ...c, id: c.id || nextId('component'), position, size: size.map(v => Math.max(0.02, Math.abs(v))) };
    }).filter(Boolean);
    return { ...level, id: level.id || nextId('level'), index: indexValue, elevation, height, footprint, walls, rooms, components, balconies: Array.isArray(level.balconies) ? level.balconies : [], terraces: Array.isArray(level.terraces) ? level.terraces : [] };
  });

  const normalized = {
    ...source,
    id: source.id || nextId('bldg'),
    name: source.name || 'Building',
    site: { boundary: null, setbacks: { front: 3, rear: 3, left: 1.5, right: 1.5 }, road: { width: 5, z: null }, ...(source.site || {}) },
    levels: levels.length ? levels : [{ id: nextId('level'), index: 1, elevation: 0, height: 3, footprint: defaultFootprint.map(p => [...p]), walls: [], rooms: [], components: [], balconies: [], terraces: [] }],
    stairs: Array.isArray(source.stairs) ? source.stairs.filter(Boolean) : [],
    roof: source.roof && typeof source.roof === 'object' ? { ...createRoof(), ...source.roof } : createRoof(),
    exterior: { compoundWall: false, gate: false, porch: false, canopy: false, paving: true, garage: null, ...(source.exterior || {}) },
    systems: { electrical: { routes: [] }, plumbing: { routes: [] }, drainage: { routes: [] }, hvac: { routes: [] }, fire: { routes: [] }, ...(source.systems || {}) },
    metadata: { ...(source.metadata || {}) },
    documentation: { dimensions: [], notes: [], grids: [], views: [], tags: [], ...(source.documentation || {}) },
    datums: { levels: [], grids: [], ...(source.datums || {}) },
    parametric: { wallAssemblies: {}, openingFamilies: {}, constraints: [], ...(source.parametric || {}) },
    structural: { strategy: 'reinforced-concrete-design-intent', ...(source.structural || {}) },
  };
  normalized.metadata.schema ||= 'archvision-bim-0.6';
  for (const k of ['electrical','plumbing','drainage','hvac','fire']) normalized.systems[k] ||= { routes: [] };
  normalized.documentation.tags ||= [];

  normalized.levels.sort((a, b) => a.index - b.index);
  let runningElevation = 0;
  for (const level of normalized.levels) {
    if (level.elevation == null) level.elevation = runningElevation;
    level.baseElevation = level.elevation;
    runningElevation = level.elevation + level.height;
    for (const wall of level.walls) {
      wall.floor = level.index;
      wall.baseElevation = Number.isFinite(Number(wall.baseElevation)) ? Number(wall.baseElevation) : level.elevation;
      wall.height = Number.isFinite(Number(wall.height)) && wall.height > 0 ? Number(wall.height) : level.height;
      wall.openings = (wall.openings || []).map(normalizeOpening);
    }
    for (const room of level.rooms) if (!room.id) room.id = nextId('room');
  }
  return normalized;
}

export function topLevel(building) {
  return building.levels[building.levels.length - 1];
}
export function groundLevel(building) {
  return building.levels.find((l) => l.index === 1) || building.levels[0];
}
