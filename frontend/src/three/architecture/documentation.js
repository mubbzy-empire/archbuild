import { wallLength } from './buildingModel.js';

export function polygonBounds(points = []) {
  if (!points.length) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const xs = points.map(p => p[0]);
  const zs = points.map(p => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

export function roomSchedule(building) {
  return building.levels.flatMap(level => (level.rooms || []).map(room => ({
    level: level.index,
    name: room.name || room.type || 'Room',
    type: room.type || 'generic',
    area: roomArea(room.polygon),
    ceiling: room.ceilingHeight || level.height,
  })));
}

export function openingSchedule(building) {
  const rows = [];
  building.levels.forEach(level => level.walls.forEach(wall => (wall.openings || []).forEach(o => rows.push({
    level: level.index,
    type: o.type,
    id: o.id,
    width: o.width,
    height: o.height,
    sill: o.sillHeight || 0,
    wall: wall.id,
  }))));
  return rows;
}

export function wallSchedule(building) {
  return building.levels.flatMap(level => level.walls.map(wall => ({
    level: level.index,
    id: wall.id,
    type: wall.type,
    length: wallLength(wall),
    thickness: wall.thickness,
    height: wall.height,
  })));
}

export function roomArea(points = []) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

export function modelSummary(building) {
  const rooms = roomSchedule(building);
  const openings = openingSchedule(building);
  const walls = wallSchedule(building);
  return {
    levels: building.levels.length,
    floorArea: rooms.reduce((s, r) => s + r.area, 0),
    rooms: rooms.length,
    bedrooms: rooms.filter(r => r.type === 'bedroom').length,
    bathrooms: rooms.filter(r => r.type === 'bathroom').length,
    walls: walls.length,
    openings: openings.length,
    doors: openings.filter(r => r.type.includes('door')).length,
    windows: openings.filter(r => r.type === 'window').length,
  };
}

export function createDrawingSet(building) {
  return [
    { id: 'A-101', title: 'Ground Floor Plan', type: 'plan', level: 1, scale: '1:100' },
    ...building.levels.slice(1).map(l => ({ id: `A-${100 + l.index}`, title: `Floor ${l.index} Plan`, type: 'plan', level: l.index, scale: '1:100' })),
    { id: 'A-201', title: 'Elevations', type: 'elevation', scale: '1:100' },
    { id: 'A-301', title: 'Building Sections', type: 'section', scale: '1:100' },
    { id: 'A-401', title: 'Door & Window Schedule', type: 'schedule', scale: '-' },
  ];
}


export function materialSchedule(building) {
  const counts = new Map();
  const add = (category, material, qty = 1, unit = 'item') => { const key = `${category}|${material}|${unit}`; counts.set(key, (counts.get(key) || 0) + qty); };
  building.levels.forEach(l => {
    l.walls.forEach(w => add(w.type === 'interior' ? 'Interior wall' : 'Exterior wall', w.material || 'plaster', wallLength(w), 'm'));
    (l.rooms || []).forEach(r => add('Floor finish', r.floorFinish || 'tile', roomArea(r.polygon), 'm²'));
    (l.components || []).forEach(c => add(c.type, c.material || 'unspecified'));
    l.walls.forEach(w => (w.openings || []).forEach(o => add(o.type.includes('door') ? 'Door' : 'Window', o.style || o.type)));
  });
  add('Roof', building.roof?.material || 'metal');
  return [...counts.entries()].map(([key, quantity]) => { const [category, material, unit] = key.split('|'); return { category, material, quantity: Number(quantity.toFixed ? quantity.toFixed(2) : quantity), unit }; });
}
export function quantitySummary(building) {
  const walls = wallSchedule(building); const rooms = roomSchedule(building); const openings = openingSchedule(building);
  return { wallLength: walls.reduce((s, x) => s + x.length, 0), floorArea: rooms.reduce((s, x) => s + x.area, 0), openings: openings.length, doors: openings.filter(x => x.type.includes('door')).length, windows: openings.filter(x => x.type === 'window').length };
}


// Deterministic architectural dimension strings derived from the actual
// footprint. These are design dimensions, not annotations invented by AI.
export function generateDimensionChains(building) {
  const out=[];
  for(const level of building.levels||[]){
    const pts=level.footprint||[]; if(pts.length<3) continue;
    const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
    out.push({id:`${level.index}-overall-x`,level:level.index,a:[minX,minZ-0.6],b:[maxX,minZ-0.6],value:maxX-minX,text:`${(maxX-minX).toFixed(2)} m`,chain:'overall'});
    out.push({id:`${level.index}-overall-z`,level:level.index,a:[minX-0.6,minZ],b:[minX-0.6,maxZ],value:maxZ-minZ,text:`${(maxZ-minZ).toFixed(2)} m`,chain:'overall'});
  }
  return out;
}

export function planSchedule(building) {
  return building.levels.map(level => ({ level: level.index, datum: level.elevation, rooms: (level.rooms||[]).length, walls: (level.walls||[]).length, area: Number((level.rooms||[]).reduce((s,r)=>s+roomArea(r.polygon||[]),0).toFixed(2)) }));
}
