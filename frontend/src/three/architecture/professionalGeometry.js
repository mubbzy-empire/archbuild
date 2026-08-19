// Phase 4 professional architectural geometry utilities.
// Pure geometry/data helpers: no Three.js dependency so the same rules can be
// used by AI, blueprint conversion, manual modeling and QA.
import { wallLength, wallVector, createRoom, nextId } from './buildingModel.js';

const EPS = 0.04;
const polygonArea = (pts=[]) => Math.abs(pts.reduce((a,p,i)=>{const q=pts[(i+1)%pts.length]; return a+p[0]*q[1]-q[0]*p[1]},0)/2);
const round = (v, p = 1000) => Math.round(v * p) / p;
const close = (a, b, eps = EPS) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= eps;
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];

export function segmentIntersection(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c), den = cross(r, s);
  if (Math.abs(den) < 1e-9) return null;
  const ca = sub(c, a), t = cross(ca, s) / den, u = cross(ca, r) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { point: add(a, mul(r, t)), t, u };
}

function projectParam(w, p) {
  const [dx, dz] = wallVector(w); const l2 = dx * dx + dz * dz || 1;
  return ((p[0] - w.start[0]) * dx + (p[1] - w.start[1]) * dz) / l2;
}

// Snap endpoints that are effectively coincident, and split crossing walls at
// true intersections. Openings remain on the original host wall; split walls
// receive only the openings whose center lies in their segment. This is a
// deterministic cleanup step suitable for interactive CAD editing.
export function solveWallNetwork(level) {
  const walls = (level.walls || []).map(w => ({ ...w, start: [...w.start], end: [...w.end], openings: (w.openings || []).map(o => ({ ...o })) }));
  const splitMap = new Map(walls.map(w => [w.id, new Set([0, 1])]));

  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i], b = walls[j];
      const hit = segmentIntersection(a.start, a.end, b.start, b.end);
      if (hit && hit.t > EPS && hit.t < 1 - EPS) splitMap.get(a.id).add(hit.t);
      if (hit && hit.u > EPS && hit.u < 1 - EPS) splitMap.get(b.id).add(hit.u);
      if (close(a.start, b.start) || close(a.start, b.end) || close(a.end, b.start) || close(a.end, b.end)) {
        const points = [a.start, a.end, b.start, b.end];
        for (const p of points) {
          if (close(a.start, p)) a.start = [...p];
          if (close(a.end, p)) a.end = [...p];
          if (close(b.start, p)) b.start = [...p];
          if (close(b.end, p)) b.end = [...p];
        }
      }
    }
  }

  const out = [];
  for (const w of walls) {
    const ts = [...splitMap.get(w.id)].sort((a, b) => a - b);
    if (ts.length <= 2) { out.push(w); continue; }
    const dx = w.end[0] - w.start[0], dz = w.end[1] - w.start[1];
    for (let i = 0; i < ts.length - 1; i++) {
      const t0 = ts[i], t1 = ts[i + 1];
      const start = [round(w.start[0] + dx * t0), round(w.start[1] + dz * t0)];
      const end = [round(w.start[0] + dx * t1), round(w.start[1] + dz * t1)];
      const child = { ...w, id: i === 0 ? w.id : nextId('wall'), start, end, openings: [] };
      for (const o of w.openings || []) {
        const centerT = o.offsetAlongWall / (wallLength(w) || 1);
        if (centerT >= t0 - EPS && centerT <= t1 + EPS) {
          child.openings.push({ ...o, offsetAlongWall: (centerT - t0) * wallLength(child) });
        }
      }
      out.push(child);
    }
  }
  level.walls = out.filter(w => wallLength(w) > 0.03);
  return level.walls;
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const intersect = ((a[1] > p[1]) !== (b[1] > p[1])) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0];
    if (intersect) inside = !inside;
  }
  return inside;
}

function coversSegment(walls, a, b) {
  const horizontal = Math.abs(a[1] - b[1]) < EPS;
  const min = horizontal ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const max = horizontal ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const at = horizontal ? a[1] : a[0];
  let spans = [];
  for (const w of walls) {
    const wh = Math.abs(w.start[1] - w.end[1]) < EPS;
    if (wh !== horizontal) continue;
    const wat = horizontal ? w.start[1] : w.start[0];
    if (Math.abs(wat - at) > EPS) continue;
    const wmin = horizontal ? Math.min(w.start[0], w.end[0]) : Math.min(w.start[1], w.end[1]);
    const wmax = horizontal ? Math.max(w.start[0], w.end[0]) : Math.max(w.start[1], w.end[1]);
    const lo = Math.max(min, wmin), hi = Math.min(max, wmax);
    if (hi > lo + EPS) spans.push([lo, hi]);
  }
  spans.sort((x, y) => x[0] - y[0]);
  let cursor = min;
  for (const [lo, hi] of spans) { if (lo > cursor + EPS) return false; cursor = Math.max(cursor, hi); }
  return cursor >= max - EPS;
}

// Reconstruct simple orthogonal rectangular room boundaries from wall
// coverage. Existing named rooms are preserved when their polygon is still
// valid; only empty/obviously stale room sets are regenerated.
export function regenerateRoomsFromWalls(level, { replace = false } = {}) {
  const walls = level.walls || [];
  const xs = [...new Set(walls.flatMap(w => [w.start[0], w.end[0]]).filter(Number.isFinite).map(v => round(v, 100)))].sort((a, b) => a - b);
  const zs = [...new Set(walls.flatMap(w => [w.start[1], w.end[1]]).filter(Number.isFinite).map(v => round(v, 100)))].sort((a, b) => a - b);
  const candidates = [];
  for (let xi = 0; xi < xs.length - 1; xi++) for (let xj = xi + 1; xj < xs.length; xj++) {
    for (let zi = 0; zi < zs.length - 1; zi++) for (let zj = zi + 1; zj < zs.length; zj++) {
      const x0 = xs[xi], x1 = xs[xj], z0 = zs[zi], z1 = zs[zj];
      if ((x1 - x0) * (z1 - z0) < 3) continue;
      const poly = [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
      if (!pointInPolygon([(x0+x1)/2,(z0+z1)/2], level.footprint || [])) continue;
      if (!coversSegment(walls, poly[0], poly[1]) || !coversSegment(walls, poly[1], poly[2]) || !coversSegment(walls, poly[2], poly[3]) || !coversSegment(walls, poly[3], poly[0])) continue;
      candidates.push(poly);
    }
  }
  // Keep the smallest valid rectangles; larger rectangles that contain a
  // smaller candidate are circulation/whole-floor shells, not rooms.
  candidates.sort((a, b) => polygonArea(a) - polygonArea(b));
  const chosen = [];
  for (const p of candidates) {
    const c = [(p[0][0]+p[2][0])/2,(p[0][1]+p[2][1])/2];
    if (chosen.some(r => pointInPolygon(c, r.polygon) && polygonArea(r.polygon) < polygonArea(p) * 1.01)) continue;
    chosen.push({ polygon: p, area: polygonArea(p) });
  }
  if (replace || !(level.rooms || []).length) level.rooms = chosen.map((r, i) => createRoom({ name: `Room ${i + 1}`, type: 'generic', floor: level.index, polygon: r.polygon, ceilingHeight: level.height }));
  return level.rooms;
}

export function stairCalculation(stair, fromLevel, toLevel) {
  const rise = Math.max(0, toLevel.elevation - fromLevel.elevation);
  const preferred = stair.riserHeight || 0.17;
  const minRisers = Math.max(3, Math.ceil(rise / 0.19));
  const maxRisers = Math.max(minRisers, Math.floor(rise / 0.14));
  let count = Math.max(minRisers, Math.min(maxRisers, Math.round(rise / preferred)));
  if (!Number.isFinite(count) || count < 3) count = Math.max(3, Math.round(rise / preferred));
  const riser = rise / count;
  const tread = stair.treadDepth || Math.max(0.25, Math.min(0.33, 0.63 - 2 * riser));
  const run = count * tread;
  return { rise, risers: count, riserHeight: riser, treadDepth: tread, run, goingRule: 2 * riser + tread, comfortable: 2 * riser + tread >= 0.59 && 2 * riser + tread <= 0.67 };
}

export function gridForFootprint(footprint = [], spacing = 3) {
  if (!footprint.length) return { x: [], z: [] };
  const xs = footprint.map(p => p[0]), zs = footprint.map(p => p[1]);
  const minX = Math.floor(Math.min(...xs) / spacing) * spacing, maxX = Math.ceil(Math.max(...xs) / spacing) * spacing;
  const minZ = Math.floor(Math.min(...zs) / spacing) * spacing, maxZ = Math.ceil(Math.max(...zs) / spacing) * spacing;
  const x = [], z = [];
  for (let v=minX,i=0; v<=maxX+EPS; v+=spacing,i++) x.push({ label:String.fromCharCode(65+i), value:round(v) });
  for (let v=minZ,i=1; v<=maxZ+EPS; v+=spacing,i++) z.push({ label:String(i), value:round(v) });
  return { x, z };
}
