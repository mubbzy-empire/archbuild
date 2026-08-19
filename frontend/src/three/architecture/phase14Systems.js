// Phase 14 — interactive CAD authoring, live wall grips, snapping and associative regeneration.
export const PHASE14_SCHEMA = 'archvision-bim-1.4';
const clone = v => JSON.parse(JSON.stringify(v));
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const dist = (a,b) => Math.hypot((b[0]-a[0]), (b[1]-a[1]));
const round = (n,p=4) => Number(Number(n||0).toFixed(p));
const now = () => new Date().toISOString();

export function normalizePhase14(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE14_SCHEMA;
  building.phase14 ||= {};
  building.phase14.schema = PHASE14_SCHEMA;
  building.phase14.authoring ||= {};
  building.phase14.authoring.snapModes ||= ['endpoint','midpoint','intersection','grid','perpendicular','nearest'];
  building.phase14.authoring.lastEdit ||= null;
  building.phase14.authoring.editCount ||= 0;
  building.phase14.associative ||= {lastSync:null,affected:0};
  return building;
}

function wallById(building, levelIndex, wallId){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  return level?.walls?.find(w=>w.id===wallId) ? {level,wall:level.walls.find(w=>w.id===wallId)} : null;
}

function wallLength(w){ return dist(w.start,w.end); }

export function snapPoint(point, snapStep=0.1, candidates=[]){
  let best=null;
  for(const c of candidates){ const d=dist(point,c.point); if(d <= Math.max(0.15,snapStep*1.5) && (!best || d<best.distance)) best={...c,distance:d,point:[...c.point]}; }
  if(best) return best;
  return {type:'grid',distance:0,point:[round(Math.round(point[0]/snapStep)*snapStep),round(Math.round(point[1]/snapStep)*snapStep)]};
}

export function wallSnapCandidates(level, excludeWallId=null){
  const out=[];
  for(const w of level?.walls||[]){
    if(w.id===excludeWallId) continue;
    out.push({type:'endpoint',id:w.id,point:[...w.start]},{type:'endpoint',id:w.id,point:[...w.end]},{type:'midpoint',id:w.id,point:[(w.start[0]+w.end[0])/2,(w.start[1]+w.end[1])/2]});
  }
  return out;
}

function clampOpenings(w){
  const len=wallLength(w);
  for(const o of w.openings||[]){
    const half=Math.max(0.05,Number(o.width||0.9)/2);
    o.offsetAlongWall=clamp(Number(o.offsetAlongWall||half),half+0.03,Math.max(half+0.03,len-half-0.03));
  }
}

export function editWallGrip(building,{levelIndex,wallId,grip,point, snapStep=0.1, live=false}){
  normalizePhase14(building);
  const found=wallById(building,levelIndex,wallId); if(!found) return null;
  const {level,wall}=found;
  const snapped=snapPoint(point,snapStep,wallSnapCandidates(level,wallId));
  if(grip==='start') wall.start=[...snapped.point];
  else if(grip==='end') wall.end=[...snapped.point];
  else { const dx=snapped.point[0]-wall.start[0], dz=snapped.point[1]-wall.start[1]; wall.start=[wall.start[0]+dx,wall.start[1]+dz]; wall.end=[wall.end[0]+dx,wall.end[1]+dz]; }
  if(wallLength(wall)<0.25) return {building,wall,snap:snapped,error:'Wall cannot be shorter than 250 mm.'};
  clampOpenings(wall);
  building.phase14.authoring.lastEdit={type:'wall-grip',wallId,levelIndex,grip,point:snapped.point,live,timestamp:now(),snap:snapped.type};
  building.phase14.authoring.editCount += 1;
  return {building,wall,snap:snapped};
}

export function moveOpeningAlongWall(building,{levelIndex,wallId,openingId,offsetAlongWall}){
  normalizePhase14(building); const found=wallById(building,levelIndex,wallId); if(!found) return null;
  const o=(found.wall.openings||[]).find(x=>x.id===openingId); if(!o) return null;
  const len=wallLength(found.wall), half=Number(o.width||0.9)/2;
  o.offsetAlongWall=clamp(Number(offsetAlongWall),half+0.03,Math.max(half+0.03,len-half-0.03));
  building.phase14.authoring.lastEdit={type:'opening-drag',openingId,wallId,levelIndex,offsetAlongWall:o.offsetAlongWall,timestamp:now()};
  building.phase14.authoring.editCount += 1;
  return o;
}

export function syncPhase14(building, reason='interactive edit'){
  normalizePhase14(building);
  for(const l of building.levels||[]) for(const w of l.walls||[]) clampOpenings(w);
  building.phase14.associative={lastSync:now(),reason,affected:(building.phase13?.lastPropagation?.affectedCount||0)};
  building.phase14.authoring.lastEdit ||= {type:'sync',timestamp:now()};
  return building;
}

export function phase14Manifest(building){
  normalizePhase14(building);
  return {schema:PHASE14_SCHEMA,project:{id:building.id,name:building.name},authoring:building.phase14.authoring,associative:building.phase14.associative,snapModes:building.phase14.authoring.snapModes,notes:['Phase 14 adds interactive CAD authoring and deterministic live-edit constraints.','All geometry and construction decisions remain subject to professional review.']};
}

export function validatePhase14(building){
  normalizePhase14(building); const errors=[],warnings=[];
  for(const l of building.levels||[]) for(const w of l.walls||[]){
    if(wallLength(w)<0.25) errors.push(`Wall ${w.id} is shorter than 250mm.`);
    for(const o of w.openings||[]){ const half=Number(o.width||0.9)/2; if(Number(o.offsetAlongWall||0)-half<0 || Number(o.offsetAlongWall||0)+half>wallLength(w)) errors.push(`Opening ${o.id} is outside host wall ${w.id}.`); }
  }
  if(!building.phase14.associative?.lastSync) warnings.push('Interactive associative synchronization has not been run.');
  return {valid:errors.length===0,errors,warnings};
}
