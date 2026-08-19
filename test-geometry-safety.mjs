import { normalizeBuilding } from './frontend/src/three/architecture/buildingModel.js';
import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';

const malformed = {
  name: 'Malformed input recovery',
  levels: [{ index: 1, height: 3, footprint: [[0, 0], null, [10, 0], [10, 10]], walls: [{ start: null, end: [10, 0] }], rooms: [{ polygon: [[0, 0], null, [4, 4]] }] }],
};
const normalized = normalizeBuilding(malformed);
for (const level of normalized.levels) {
  if (!level.footprint.every(p => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite))) throw new Error('Footprint normalization failed');
  if (!level.walls.every(w => w.start.concat(w.end).every(Number.isFinite))) throw new Error('Wall normalization failed');
}
const demo = generateBuildingFromBrief({ name: 'Safety bungalow', floors: 1, footprint: { width: 12, depth: 10 }, bedrooms: 3, bathrooms: 2, roofType: 'flat', style: 'modern' });
if (!demo.levels[0]?.walls?.length || !demo.levels[0]?.rooms?.length) throw new Error('Demo geometry generation failed');
console.log(JSON.stringify({ validation: 'passed', normalizedWalls: normalized.levels[0].walls.length, demoRooms: demo.levels[0].rooms.length, demoWalls: demo.levels[0].walls.length }, null, 2));
