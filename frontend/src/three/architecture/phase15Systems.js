// Phase 15 — real-time associative propagation, model regeneration and change-impact tracking.
export const PHASE15_SCHEMA = 'archvision-bim-1.5';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const area = pts => Math.abs((pts || []).reduce((s,p,i) => { const q=pts[(i+1)%pts.length] || p; return s + p[0]*q[1]-q[0]*p[1]; },0)/2);
const wallLen = w => Math.hypot((w.end?.[0]||0)-(w.start?.[0]||0),(w.end?.[1]||0)-(w.start?.[1]||0));

export function normalizePhase15(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE15_SCHEMA;
  building.phase15 ||= {};
  building.phase15.schema = PHASE15_SCHEMA;
  building.phase15.regeneration ||= {lastRun:null,passes:0,dirty:[],affected:0};
  building.phase15.impact ||= [];
  building.phase15.authoring ||= {mode:'associative',livePropagation:true};
  return building;
}

function refKey(r){ return `${r.kind}:${r.id}:${r.level ?? ''}`; }
function collectDependents(building, changedRefs){
  const deps = building.phase13?.dependencies || [];
  const seen = new Set(changedRefs.map(refKey));
  const queue = [...seen];
  while(queue.length){
    const key=queue.shift();
    for(const d of deps){
      if(refKey(d.source) !== key) continue;
      const target=refKey(d.target);
      if(!seen.has(target)){ seen.add(target); queue.push(target); }
    }
  }
  return [...seen];
}

function normalizeOpenings(building){
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    const len=wallLen(wall);
    for(const o of wall.openings||[]){
      const half=Math.max(0.05,Number(o.width||0.9)/2);
      o.offsetAlongWall=Math.max(half+0.03,Math.min(Number(o.offsetAlongWall||half+0.03),Math.max(half+0.03,len-half-0.03)));
      o.hostWallId=wall.id; o.hostLevel=level.index;
    }
  }
}

function updateRoomMetrics(building){
  for(const level of building.levels||[]) for(const room of level.rooms||[]){
    room.areaM2 = Number(area(room.polygon||[]).toFixed(3));
    room.level = level.index;
    room.hostLevel = level.index;
    room.boundaryWallIds ||= [];
    room.associative ||= {};
    room.associative.lastUpdated = now();
  }
}

function updateDocumentation(building){
  building.documentation ||= {};
  if(Array.isArray(building.documentation.dimensions)){
    building.documentation.dimensions = building.documentation.dimensions.map(d => ({...d, associative:true, lastUpdated:now()}));
  }
  if(Array.isArray(building.documentation.tags)){
    building.documentation.tags = building.documentation.tags.map(t => ({...t, associative:true, lastUpdated:now()}));
  }
  building.documentation.associative ||= {};
  building.documentation.associative.lastUpdated = now();
}

export function propagatePhase15(building, changedRefs=[], reason='associative edit'){
  normalizePhase15(building);
  const affected = collectDependents(building, changedRefs);
  normalizeOpenings(building);
  updateRoomMetrics(building);
  updateDocumentation(building);
  building.phase15.impact.unshift({id:`impact-${Date.now()}`,timestamp:now(),reason,changed:changedRefs.map(refKey),affected});
  building.phase15.impact = building.phase15.impact.slice(0,100);
  building.phase15.regeneration.dirty = affected;
  return affected;
}

export function regeneratePhase15(building, {reason='full associative regeneration', changedRefs=[]}={}){
  normalizePhase15(building);
  const affected = propagatePhase15(building, changedRefs, reason);
  building.phase15.regeneration = {lastRun:now(),passes:(building.phase15.regeneration.passes||0)+1,dirty:[],affected:affected.length};
  building.phase15.lastRegenerated = building.phase15.regeneration.lastRun;
  return building;
}

export function phase15ChangeImpact(building){
  normalizePhase15(building);
  return building.phase15.impact[0] || null;
}

export function validatePhase15(building){
  normalizePhase15(building); const errors=[],warnings=[];
  const ids=new Set();
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(wallLen(wall)<0.25) errors.push(`Wall ${wall.id} is shorter than 250mm.`);
    for(const o of wall.openings||[]){
      if(o.hostWallId && o.hostWallId!==wall.id) errors.push(`Opening ${o.id} has stale host metadata.`);
      const k=`${o.type}:${o.id}:${level.index}`; if(ids.has(k)) errors.push(`Duplicate associative identity ${k}`); ids.add(k);
    }
    const wk=`wall:${wall.id}:${level.index}`; if(ids.has(wk)) errors.push(`Duplicate associative identity ${wk}`); ids.add(wk);
  }
  for(const level of building.levels||[]) for(const room of level.rooms||[]) if(Number(room.areaM2||0)<=0) warnings.push(`Room ${room.id} has no positive calculated area.`);
  if(!building.phase15.regeneration.lastRun) warnings.push('Phase 15 associative regeneration has not been run.');
  return {valid:errors.length===0,errors,warnings};
}

export function phase15Manifest(building){
  normalizePhase15(building);
  return {schema:PHASE15_SCHEMA,project:{id:building.id,name:building.name},authoring:building.phase15.authoring,regeneration:building.phase15.regeneration,lastImpact:phase15ChangeImpact(building),notes:['Phase 15 establishes deterministic change-impact propagation and model regeneration.','Professional review remains required for construction decisions.']};
}
