// Phase 16 — professional geometry authoring: offset/trim/extend, join cleanup,
// layered wall solids, associative edit impact and CAD command state.
export const PHASE16_SCHEMA = 'archvision-bim-1.6';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot((b[0]-a[0]), (b[1]-a[1]));
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const wallLength = w => dist(w.start,w.end);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];

export function normalizePhase16(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE16_SCHEMA;
  building.phase16 ||= {};
  building.phase16.schema = PHASE16_SCHEMA;
  building.phase16.authoring ||= {command:null,offsetDistance:0.2,trimExtendMode:'trim',lastOperation:null,operationCount:0};
  building.phase16.layerGeometry ||= {enabled:true,assemblies:0};
  building.phase16.associative ||= {lastRegeneration:null,changed:[],affected:[]};
  for(const level of building.levels||[]) for(const wall of level.walls||[]) {
    wall.construction ||= {};
    wall.construction.layerGeometry = true;
    wall.construction.assemblyId ||= wall.type==='interior'?'INT-WALL-100':'EXT-WALL-200';
  }
  return building;
}

function findWall(building, levelIndex, wallId){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  const wall=level?.walls?.find(w=>w.id===wallId);
  return wall ? {level,wall} : null;
}
function cross(a,b){return a[0]*b[1]-a[1]*b[0];}
function sub(a,b){return [a[0]-b[0],a[1]-b[1]];}
function add(a,b){return [a[0]+b[0],a[1]+b[1]];}
function mul(a,s){return [a[0]*s,a[1]*s];}
function unit(v){const d=Math.hypot(v[0],v[1])||1;return [v[0]/d,v[1]/d];}
function lineIntersection(a,b,c,d){
  const r=sub(b,a), s=sub(d,c), den=cross(r,s);
  if(Math.abs(den)<1e-9) return null;
  const t=cross(sub(c,a),s)/den;
  return add(a,mul(r,t));
}
function projectT(point, wall){ const v=sub(wall.end,wall.start); const l2=dot(v,v)||1; return dot(sub(point,wall.start),v)/l2; }
function setOpeningHost(wall){
  const len=wallLength(wall);
  for(const o of wall.openings||[]){
    const half=Math.max(0.05,Number(o.width||0.9)/2);
    o.offsetAlongWall=clamp(Number(o.offsetAlongWall||half),half+0.03,Math.max(half+0.03,len-half-0.03));
    o.hostWallId=wall.id;
  }
}

export function offsetWall(building,{levelIndex,wallId,distance=0.2,side=1}={}){
  normalizePhase16(building); const f=findWall(building,levelIndex,wallId); if(!f) return null;
  const {wall}=f; const u=unit(sub(wall.end,wall.start)); const n=[u[1],-u[0]]; const delta=mul(n,Number(distance||0)*Number(side||1));
  wall.start=add(wall.start,delta); wall.end=add(wall.end,delta); setOpeningHost(wall);
  recordOperation(building,{type:'wall-offset',wallId,levelIndex,distance:Number(distance||0),side:Number(side||1)});
  return wall;
}

export function trimWallTo(building,{levelIndex,wallId,targetWallId,keep='start'}={}){
  normalizePhase16(building); const a=findWall(building,levelIndex,wallId), b=findWall(building,levelIndex,targetWallId); if(!a||!b||a.wall.id===b.wall.id) return null;
  const hit=lineIntersection(a.wall.start,a.wall.end,b.wall.start,b.wall.end); if(!hit) return null;
  const t=projectT(hit,a.wall); if(t<0||t>1) return null;
  if(keep==='start') a.wall.end=hit; else a.wall.start=hit;
  if(wallLength(a.wall)<0.25) return null;
  setOpeningHost(a.wall); recordOperation(building,{type:'wall-trim',wallId,targetWallId,levelIndex,keep,point:hit}); return hit;
}

export function extendWallTo(building,{levelIndex,wallId,targetWallId,which='end'}={}){
  normalizePhase16(building); const a=findWall(building,levelIndex,wallId), b=findWall(building,levelIndex,targetWallId); if(!a||!b||a.wall.id===b.wall.id) return null;
  const hit=lineIntersection(a.wall.start,a.wall.end,b.wall.start,b.wall.end); if(!hit) return null;
  if(which==='start') a.wall.start=hit; else a.wall.end=hit;
  setOpeningHost(a.wall); recordOperation(building,{type:'wall-extend',wallId,targetWallId,levelIndex,which,point:hit}); return hit;
}

export function joinWalls(building,{levelIndex,tolerance=0.12}={}){
  normalizePhase16(building); const level=(building.levels||[]).find(l=>l.index===levelIndex); if(!level) return [];
  const walls=level.walls||[], joins=[];
  const endpoints=(w)=>[{which:'start',p:w.start},{which:'end',p:w.end}];
  for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
    const a=walls[i], b=walls[j];
    for(const ea of endpoints(a)) for(const eb of endpoints(b)){
      if(dist(ea.p,eb.p)<=tolerance){
        const p=[(ea.p[0]+eb.p[0])/2,(ea.p[1]+eb.p[1])/2]; a[ea.which]=[...p]; b[eb.which]=[...p];
        joins.push({wallA:a.id,wallB:b.id,point:p,type:'corner'});
      }
    }
    const hit=lineIntersection(a.start,a.end,b.start,b.end);
    if(hit){ const ta=projectT(hit,a), tb=projectT(hit,b); if(ta>=0&&ta<=1&&tb>=0&&tb<=1) joins.push({wallA:a.id,wallB:b.id,point:hit,type:'intersection'}); }
  }
  for(const w of walls) setOpeningHost(w);
  building.phase16.authoring.lastJoinReport={level:levelIndex,joins,timestamp:now()};
  recordOperation(building,{type:'wall-join-cleanup',levelIndex,joins:joins.length});
  return joins;
}

export function regeneratePhase16(building,{reason='phase 16 regeneration',changedRefs=[]}={}){
  normalizePhase16(building);
  const affected=new Set(changedRefs.map(r=>`${r.kind}:${r.id}:${r.level??''}`));
  for(const level of building.levels||[]) for(const wall of level.walls||[]) {
    setOpeningHost(wall);
    if(changedRefs.some(r=>r.kind==='wall'&&r.id===wall.id)){
      for(const o of wall.openings||[]) affected.add(`opening:${o.id}:${level.index}`);
    }
    for(const room of level.rooms||[]) if((room.boundaryWallIds||[]).includes(wall.id)) affected.add(`room:${room.id}:${level.index}`);
  }
  building.phase16.associative={lastRegeneration:now(),changed:clone(changedRefs),affected:[...affected]};
  building.phase16.lastReason=reason;
  return building;
}

function recordOperation(building,op){
  normalizePhase16(building); building.phase16.authoring.lastOperation={...op,timestamp:now()}; building.phase16.authoring.operationCount=(building.phase16.authoring.operationCount||0)+1;
}

export function setPhase16Command(building,command){normalizePhase16(building);building.phase16.authoring.command=command;return building;}
export function phase16Manifest(building){normalizePhase16(building);return {schema:PHASE16_SCHEMA,project:{id:building.id,name:building.name},authoring:building.phase16.authoring,layerGeometry:building.phase16.layerGeometry,associative:building.phase16.associative,lastJoinReport:building.phase16.authoring.lastJoinReport||null,notes:['Phase 16 provides deterministic CAD geometry operations and construction-layer geometry.','Professional architectural and engineering review remains required.']};}
export function validatePhase16(building){
  normalizePhase16(building); const errors=[],warnings=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(wallLength(wall)<0.25) errors.push(`Wall ${wall.id} is shorter than 250mm.`);
    if(!wall.construction?.assemblyId) warnings.push(`Wall ${wall.id} has no construction assembly.`);
    for(const o of wall.openings||[]) if(o.hostWallId&&o.hostWallId!==wall.id) errors.push(`Opening ${o.id} has invalid host wall.`);
  }
  if(!building.phase16.associative.lastRegeneration) warnings.push('Phase 16 associative regeneration has not run.');
  return {valid:errors.length===0,errors,warnings};
}
