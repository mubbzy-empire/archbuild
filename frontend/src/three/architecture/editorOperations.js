import { nextId, wallLength } from './buildingModel.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

export function findSelected(building, selected) {
  if (!building || !selected) return null;
  const level = building.levels.find((l) => l.index === selected.floor);
  if (!level) return null;
  if (selected.kind === 'wall') return { level, entity: level.walls.find((x) => x.id === selected.id) };
  if (selected.kind === 'component') return { level, entity: (level.components || []).find((x) => x.id === selected.id) };
  if (selected.kind === 'room') return { level, entity: level.rooms.find((x) => x.id === selected.id) };
  if (selected.kind === 'opening') {
    for (const wall of level.walls) {
      const opening = (wall.openings || []).find((x) => x.id === selected.id);
      if (opening) return { level, entity: opening, wall };
    }
  }
  return null;
}

export function moveSelected(building, selected, dx, dz) {
  const found = findSelected(building, selected);
  if (!found) return building;
  const { entity, wall } = found;
  if (selected.kind === 'wall') {
    entity.start[0] += dx; entity.start[1] += dz;
    entity.end[0] += dx; entity.end[1] += dz;
  } else if (selected.kind === 'component') {
    entity.position[0] += dx; entity.position[2] += dz;
  } else if (selected.kind === 'room') {
    entity.polygon = entity.polygon.map(([x, z]) => [x + dx, z + dz]);
  } else if (selected.kind === 'opening' && wall) {
    entity.offsetAlongWall = Math.max(entity.width / 2 + 0.05, Math.min(wallLength(wall) - entity.width / 2 - 0.05, entity.offsetAlongWall + dx));
  }
  return building;
}

export function rotateSelected(building, selected, degrees) {
  const found = findSelected(building, selected);
  if (!found) return building;
  const { entity } = found;
  const rad = degrees * Math.PI / 180;
  if (selected.kind === 'component') entity.rotation = (entity.rotation || 0) + rad;
  if (selected.kind === 'room') {
    const pts = entity.polygon || [];
    const c = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
    const center = [c[0] / Math.max(1, pts.length), c[1] / Math.max(1, pts.length)];
    entity.polygon = pts.map(([x, z]) => {
      const dx = x - center[0], dz = z - center[1];
      return [center[0] + dx * Math.cos(rad) - dz * Math.sin(rad), center[1] + dx * Math.sin(rad) + dz * Math.cos(rad)];
    });
  }
  return building;
}

export function mirrorSelected(building, selected, axis = 'x') {
  const found = findSelected(building, selected);
  if (!found) return building;
  const { entity } = found;
  const flip = (p) => axis === 'x' ? [-p[0], p[1]] : [p[0], -p[1]];
  if (selected.kind === 'wall') { entity.start = flip(entity.start); entity.end = flip(entity.end); }
  if (selected.kind === 'component') entity.position = [axis === 'x' ? -entity.position[0] : entity.position[0], entity.position[1], axis === 'z' ? -entity.position[2] : entity.position[2]];
  if (selected.kind === 'room') entity.polygon = entity.polygon.map(flip);
  return building;
}

export function duplicateSelected(building, selected, offset = [1, 1]) {
  const found = findSelected(building, selected);
  if (!found) return null;
  const { level, entity, wall } = found;
  let copy = clone(entity);
  if (selected.kind === 'wall') {
    copy.id = nextId('wall');
    copy.start = [copy.start[0] + offset[0], copy.start[1] + offset[1]];
    copy.end = [copy.end[0] + offset[0], copy.end[1] + offset[1]];
    copy.openings = (copy.openings || []).map((o) => ({ ...o, id: nextId(o.type || 'opening') }));
    level.walls.push(copy);
  } else if (selected.kind === 'component') {
    copy.id = nextId(copy.type || 'component');
    copy.name = `${copy.name || copy.type || 'Component'} Copy`;
    copy.position = [copy.position[0] + offset[0], copy.position[1], copy.position[2] + offset[1]];
    level.components = level.components || [];
    level.components.push(copy);
  } else if (selected.kind === 'room') {
    copy.id = nextId('room');
    copy.name = `${copy.name || 'Room'} Copy`;
    copy.polygon = (copy.polygon || []).map(([x, z]) => [x + offset[0], z + offset[1]]);
    level.rooms.push(copy);
  } else if (selected.kind === 'opening' && wall) {
    copy.id = nextId(copy.type || 'opening');
    copy.offsetAlongWall += offset[0];
    wall.openings.push(copy);
  }
  return copy;
}

export function normalizeNumericField(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
