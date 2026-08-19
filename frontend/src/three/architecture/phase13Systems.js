// Phase 13 — associative authoring, dependency propagation, versioning and construction takeoff.
export const PHASE13_SCHEMA = 'archvision-bim-1.3';
const clone = v => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot((b[0]-a[0]), (b[1]-a[1]));
const wallLen = w => dist(w.start,w.end);
const round = (n,p=3) => Number(Number(n||0).toFixed(p));
const now = () => new Date().toISOString();

export function normalizePhase13(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE13_SCHEMA;
  building.phase13 ||= {};
  building.phase13.version ||= 1;
  building.phase13.history ||= [];
  building.phase13.versions ||= [];
  building.phase13.dependencies ||= [];
  building.phase13.changes ||= [];
  building.phase13.takeoff ||= {};
  building.phase13.authoring ||= {selectedGrip:null,activeTransaction:null};
  return building;
}

function elementRef(kind,id,level){ return {kind,id,level}; }
function collect(building){
  const out=[];
  for(const l of building.levels||[]){
    for(const w of l.walls||[]){ out.push({ref:elementRef('wall',w.id,l.index),bounds:{a:w.start,b:w.end}}); for(const o of w.openings||[]) out.push({ref:elementRef(o.type||'opening',o.id,l.index),host:w.id}); }
    for(const r of l.rooms||[]) out.push({ref:elementRef('room',r.id,l.index),boundary:r.polygon||[]});
    for(const c of l.components||[]) out.push({ref:elementRef(c.type||'component',c.id,l.index),position:c.position,size:c.size});
  }
  for(const s of building.stairs||[]) out.push({ref:elementRef('stair',s.id,s.fromFloor),toFloor:s.toFloor});
  return out;
}

export function buildDependencyGraph(building){
  normalizePhase13(building); const deps=[];
  for(const l of building.levels||[]) for(const w of l.walls||[]){
    for(const o of w.openings||[]) deps.push({source:elementRef('wall',w.id,l.index),target:elementRef(o.type||'opening',o.id,l.index),relation:'hosts'});
    for(const r of l.rooms||[]) if((r.boundaryWallIds||[]).includes(w.id)) deps.push({source:elementRef('wall',w.id,l.index),target:elementRef('room',r.id,l.index),relation:'bounds'});
  }
  for(const s of building.stairs||[]) deps.push({source:elementRef('level',s.fromFloor,s.fromFloor),target:elementRef('stair',s.id,s.fromFloor),relation:'starts-at'}, {source:elementRef('level',s.toFloor,s.toFloor),target:elementRef('stair',s.id,s.fromFloor),relation:'ends-at'});
  for(const d of building.documentation?.dimensions||[]) if(d.hostId) deps.push({source:elementRef(d.hostKind||'wall',d.hostId,d.level),target:elementRef('dimension',d.id,d.level),relation:'documents'});
  for(const t of building.documentation?.tags||[]) if(t.elementId) deps.push({source:elementRef(t.elementKind||'element',t.elementId,t.level),target:elementRef('tag',t.id,t.level),relation:'tags'});
  building.phase13.dependencies=deps; return deps;
}

export function propagateAssociativity(building, changedRefs=[], reason='edit'){
  normalizePhase13(building); const affected=new Map(); const deps=buildDependencyGraph(building);
  const queue=[...changedRefs.map(x=>`${x.kind}:${x.id}:${x.level??''}`)];
  while(queue.length){ const key=queue.shift(); if(affected.has(key)) continue; affected.set(key,true); for(const d of deps){const s=`${d.source.kind}:${d.source.id}:${d.source.level??''}`; if(s===key){const t=`${d.target.kind}:${d.target.id}:${d.target.level??''}`; if(!affected.has(t)) queue.push(t);}} }
  const stamp=now();
  building.phase13.changes.push({id:`chg-${Date.now()}`,timestamp:stamp,reason,changed:changedRefs,affected:[...affected.keys()]});
  building.phase13.changes=building.phase13.changes.slice(-100);
  building.phase13.lastPropagation={timestamp:stamp,reason,affectedCount:affected.size};
  return [...affected.keys()];
}

export function beginTransaction(building,label='Model edit'){
  normalizePhase13(building); const tx={id:`tx-${Date.now()}`,label,startedAt:now(),before:clone(building)}; building.phase13.authoring.activeTransaction={id:tx.id,label:tx.label,startedAt:tx.startedAt}; return tx;
}
export function commitTransaction(building,tx,changedRefs=[],reason=tx?.label||'Model edit'){
  normalizePhase13(building); propagateAssociativity(building,changedRefs,reason);
  const stamp=now(); const record={id:tx?.id||`tx-${Date.now()}`,label:tx?.label||reason,startedAt:tx?.startedAt||stamp,committedAt:stamp,changed:changedRefs};
  building.phase13.history.push(record); building.phase13.history=building.phase13.history.slice(-100); building.phase13.version+=1; building.phase13.authoring.activeTransaction=null; return record;
}
export function rollbackTransaction(building,tx){ return tx?.before ? clone(tx.before) : building; }

export function createModelVersion(building,label='Manual checkpoint'){
  normalizePhase13(building); const snapshot=clone(building); delete snapshot.phase13?.versions; const version={id:`v${building.phase13.versions.length+1}`,number:building.phase13.version,label,createdAt:now(),snapshot}; building.phase13.versions.push({id:version.id,number:version.number,label:version.label,createdAt:version.createdAt,snapshot}); building.phase13.versions=building.phase13.versions.slice(-20); building.phase13.lastVersion=version; return version;
}
export function restoreModelVersion(building,id){
  normalizePhase13(building); const v=building.phase13.versions.find(x=>x.id===id); if(!v) return null; const restored=clone(v.snapshot); restored.phase13 ||= {}; restored.phase13.versions=building.phase13.versions; restored.phase13.history=building.phase13.history; restored.phase13.version=(building.phase13.version||1)+1; restored.phase13.lastRestored=id; return restored;
}

export function moveWallGrip(building,wallId,levelIndex,grip,delta){
  const level=(building.levels||[]).find(l=>l.index===levelIndex); const w=level?.walls?.find(x=>x.id===wallId); if(!w) return null;
  const d=[Number(delta?.[0]||0),Number(delta?.[1]||0)]; if(grip==='start') w.start=[w.start[0]+d[0],w.start[1]+d[1]]; else if(grip==='end') w.end=[w.end[0]+d[0],w.end[1]+d[1]]; else { w.start=[w.start[0]+d[0],w.start[1]+d[1]]; w.end=[w.end[0]+d[0],w.end[1]+d[1]]; }
  for(const o of w.openings||[]) { const len=wallLen(w); const min=o.width/2+0.05; o.offsetAlongWall=Math.max(min,Math.min(o.offsetAlongWall||min,Math.max(min,len-o.width/2-0.05))); }
  return w;
}

export function calculateConstructionTakeoff(building){
  normalizePhase13(building); const wall={length:0,area:0,volume:0}; const openings={count:0,area:0}; const floors={area:0}; const roof={area:0}; const doors={count:0}; const windows={count:0};
  for(const l of building.levels||[]){ floors.area += polygonArea(l.footprint||[]); for(const w of l.walls||[]){const len=wallLen(w); wall.length+=len; wall.area+=len*(w.height||l.height||3); wall.volume+=len*(w.thickness||0.2)*(w.height||l.height||3); for(const o of w.openings||[]){openings.count++; openings.area+=Number(o.width||0)*Number(o.height||0); if(o.type==='door') doors.count++; if(o.type==='window') windows.count++;}} }
  for(const p of building.roof?.planes||[]) roof.area += Number(p.area||0);
  const netWallArea=Math.max(0,wall.area-openings.area);
  building.phase13.takeoff={walls:{lengthM:round(wall.length),grossAreaM2:round(wall.area),netAreaM2:round(netWallArea),volumeM3:round(wall.volume)},openings:{count:openings.count,areaM2:round(openings.area),doors:doors.count,windows:windows.count},floors:{areaM2:round(floors.area)},roof:{areaM2:round(roof.area)},generatedAt:now()};
  return building.phase13.takeoff;
}

export function validatePhase13(building){
  normalizePhase13(building); const errors=[],warnings=[]; const seen=new Set();
  for(const e of collect(building)){const k=`${e.ref.kind}:${e.ref.id}:${e.ref.level}`; if(seen.has(k)) errors.push(`Duplicate model identity ${k}`); seen.add(k);}
  for(const l of building.levels||[]) for(const w of l.walls||[]){ if(wallLen(w)<0.1) errors.push(`Wall ${w.id} is shorter than 100mm.`); for(const o of w.openings||[]) if((o.offsetAlongWall||0)-o.width/2<0 || (o.offsetAlongWall||0)+o.width/2>wallLen(w)) errors.push(`Opening ${o.id} is outside host wall ${w.id}.`); }
  if(!building.phase13.dependencies.length) warnings.push('Dependency graph has not been generated.');
  if(!building.phase13.takeoff.generatedAt) warnings.push('Construction takeoff has not been generated.');
  return {valid:errors.length===0,errors,warnings};
}

export function phase13Manifest(building){
  normalizePhase13(building); return {schema:PHASE13_SCHEMA,project:{id:building.id,name:building.name},version:building.phase13.version,dependencyGraph:building.phase13.dependencies,history:building.phase13.history,changes:building.phase13.changes,takeoff:building.phase13.takeoff,lastPropagation:building.phase13.lastPropagation||null,versions:(building.phase13.versions||[]).map(v=>({id:v.id,number:v.number,label:v.label,createdAt:v.createdAt})),notes:['Phase 13 provides deterministic associative authoring and construction takeoff data.','Geometry and quantities remain design-authoring outputs and require professional review before construction.']};
}

function polygonArea(pts){return Math.abs((pts||[]).reduce((a,p,i)=>{const q=pts[(i+1)%pts.length]||p;return a+p[0]*q[1]-q[0]*p[1]},0)/2)}
