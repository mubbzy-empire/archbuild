// Phase 6 production systems: associative BIM/CAD data, parametric assemblies,
// model-derived tags, professional QA and interoperability preparation.
import { wallLength, wallMidpoint, roomArea } from './buildingModel.js';

const EPS = 0.045;
const round = (n, p=1000) => Math.round(n*p)/p;
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);

export const PHASE6_SCHEMA = 'archvision-bim-0.6';

export function ensureParametricData(building) {
  building.parametric ||= { wallAssemblies: {}, openingFamilies: {}, constraints: [] };
  building.datums ||= { levels: [], grids: [] };
  building.documentation ||= {};
  building.documentation.tags ||= [];
  building.documentation.dimensions ||= [];
  for (const level of building.levels || []) {
    level.datum ||= { name: `F${level.index}`, elevation: level.elevation };
    for (const wall of level.walls || []) {
      wall.assembly ||= wall.type === 'interior' ? 'INT-100' : 'EXT-200';
      wall.constraints ||= { horizontal: false, vertical: false, lockedLength: false };
      wall.joinStyle ||= 'clean';
      wall.hostedOpeningIds = (wall.openings || []).map(o => o.id);
    }
    for (const room of level.rooms || []) room.netArea = round(roomArea(room), 3);
  }
  building.datums.levels = (building.levels || []).map(l => ({ id:`L${l.index}`, name:`F${l.index}`, elevation:l.elevation }));
  return building;
}

export function wallAssemblySchedule(building) {
  const map = new Map();
  const defaults = {
    'EXT-200': {name:'External wall 200', layers:[['plaster',0.015],['blockwork',0.17],['plaster',0.015]]},
    'INT-100': {name:'Internal partition 100', layers:[['plaster',0.0125],['blockwork',0.075],['plaster',0.0125]]},
    'EXT-250': {name:'External wall 250', layers:[['render',0.015],['blockwork',0.20],['insulation',0.02],['plaster',0.015]]},
  };
  for (const level of building.levels || []) for (const w of level.walls || []) {
    const key = w.assembly || 'EXT-200'; const d = defaults[key] || defaults['EXT-200'];
    const length = wallLength(w); const item = map.get(key) || {id:key,name:d.name,layers:d.layers,totalLength:0,volume:0};
    item.totalLength += length; item.volume += length * (w.thickness || d.layers.reduce((s,l)=>s+l[1],0)) * (w.height || level.height);
    map.set(key,item);
  }
  return [...map.values()].map(x=>({...x,totalLength:round(x.totalLength,2),volume:round(x.volume,2)}));
}

export function deriveAssociativeDimensions(building) {
  const dimensions = [];
  for (const level of building.levels || []) {
    const walls = level.walls || [];
    for (const wall of walls) {
      const len = wallLength(wall); if (len < 0.05) continue;
      dimensions.push({id:`DIM-${wall.id}-L`,level:level.index,kind:'wall-length',host:wall.id,a:[...wall.start],b:[...wall.end],value:round(len,3),text:`${round(len,2)} m`});
      for (const o of wall.openings || []) {
        const half=o.width/2, before=o.offsetAlongWall-half, after=o.offsetAlongWall+half;
        const len0=Math.max(0,before), len1=Math.min(len,after);
        const center = wallMidpoint(wall); // stored as a host reference for downstream drawing
        dimensions.push({id:`DIM-${o.id}-W`,level:level.index,kind:'opening-width',host:o.id,wallId:wall.id,offset:o.offsetAlongWall,value:round(o.width,3),text:`${round(o.width,2)} m`,hostCenter:center,valid:len0<=len1});
      }
    }
  }
  building.documentation.dimensions = dimensions;
  return dimensions;
}

export function deriveModelTags(building) {
  const tags=[];
  for (const level of building.levels || []) {
    for (const room of level.rooms || []) {
      const p=room.polygon||[]; if(p.length<3) continue;
      const c=p.reduce((s,x)=>[s[0]+x[0],s[1]+x[1]],[0,0]).map(v=>v/p.length);
      tags.push({id:`TAG-${room.id}`,kind:'room',level:level.index,host:room.id,text:room.name||room.type||'Room',position:c});
    }
    for (const wall of level.walls || []) for (const o of wall.openings || []) {
      const len=wallLength(wall)||1, t=o.offsetAlongWall/len; const x=wall.start[0]+(wall.end[0]-wall.start[0])*t; const z=wall.start[1]+(wall.end[1]-wall.start[1])*t;
      tags.push({id:`TAG-${o.id}`,kind:o.type.includes('door')?'door':'window',level:level.index,host:o.id,text:o.id,position:[x,z]});
    }
  }
  building.documentation.tags=tags;
  return tags;
}

export function deriveLevelAndGridDatums(building, spacing=3) {
  const all=building.levels.flatMap(l=>l.footprint||[]); if(!all.length) return building.datums;
  const xs=all.map(p=>p[0]), zs=all.map(p=>p[1]); const minX=Math.floor(Math.min(...xs)/spacing)*spacing, maxX=Math.ceil(Math.max(...xs)/spacing)*spacing, minZ=Math.floor(Math.min(...zs)/spacing)*spacing, maxZ=Math.ceil(Math.max(...zs)/spacing)*spacing;
  const grids=[]; let i=0; for(let x=minX;x<=maxX+EPS;x+=spacing,i++) grids.push({id:`G-${String.fromCharCode(65+i)}`,axis:'x',label:String.fromCharCode(65+i),value:round(x,3)});
  let j=1; for(let z=minZ;z<=maxZ+EPS;z+=spacing,j++) grids.push({id:`G-${j}`,axis:'z',label:String(j),value:round(z,3)});
  building.datums.grids=grids; return building.datums;
}

export function validatePhase6(building) {
  const errors=[], warnings=[];
  for (const level of building.levels || []) {
    const footprint=level.footprint||[];
    for (const wall of level.walls || []) {
      if (wallLength(wall)<0.05) errors.push(`Wall ${wall.id} is below minimum usable length.`);
      const len=wallLength(wall);
      for (const o of wall.openings || []) if (o.offsetAlongWall-o.width/2 < -EPS || o.offsetAlongWall+o.width/2 > len+EPS) errors.push(`Opening ${o.id} exceeds host wall ${wall.id}.`);
      if (!['interior','exterior','compound','parapet'].includes(wall.type)) warnings.push(`Wall ${wall.id} has an unclassified type.`);
    }
    for (const room of level.rooms || []) {
      const area=roomArea(room); if(area<1) warnings.push(`Room ${room.id} is smaller than 1 m².`);
      if (footprint.length>=3 && !room.polygon?.every(p=>pointInPolygon(p,footprint))) warnings.push(`Room ${room.id} extends outside the floor footprint.`);
    }
  }
  for (const stair of building.stairs || []) {
    const from=building.levels.find(l=>l.index===stair.fromFloor), to=building.levels.find(l=>l.index===stair.toFloor);
    if(from&&to){ const rise=to.elevation-from.elevation; if(rise<=0) errors.push(`Stair ${stair.id} has no positive floor-to-floor rise.`); if(stair.width<0.9) warnings.push(`Stair ${stair.id} is narrower than 900 mm design guidance.`); }
  }
  if(!building.site?.boundary?.length) warnings.push('No site/plot boundary is attached to the project.');
  return {valid:errors.length===0,errors,warnings};
}

function pointInPolygon(p, poly){ let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j]; const hit=((a[1]>p[1])!==(b[1]>p[1]))&&p[0]<(b[0]-a[0])*(p[1]-a[1])/((b[1]-a[1])||1e-9)+a[0]; if(hit) inside=!inside;} return inside; }

export function phase6Manifest(building) {
  ensureParametricData(building); deriveAssociativeDimensions(building); deriveModelTags(building); deriveLevelAndGridDatums(building);
  return {schema:PHASE6_SCHEMA,projectId:building.id,name:building.name,levels:building.levels.map(l=>({id:l.id,index:l.index,elevation:l.elevation,height:l.height,datum:l.datum})),datums:building.datums,parametric:building.parametric,wallAssemblies:wallAssemblySchedule(building),documentation:{dimensions:building.documentation.dimensions,tags:building.documentation.tags},qa:validatePhase6(building)};
}
