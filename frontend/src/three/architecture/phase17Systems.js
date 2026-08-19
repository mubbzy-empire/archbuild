// Phase 17 — advanced architectural openings and wall topology.
// Deterministic authoring data for professional CAD workflows.
export const PHASE17_SCHEMA = 'archvision-bim-1.7';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const mul=(a,s)=>[a[0]*s,a[1]*s];
const unit=v=>{const d=Math.hypot(v[0],v[1])||1;return [v[0]/d,v[1]/d]};
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const wallLen=w=>dist(w.start,w.end);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lineIntersection=(a,b,c,d)=>{const r=sub(b,a),s=sub(d,c),den=cross(r,s);if(Math.abs(den)<1e-9)return null;const t=cross(sub(c,a),s)/den;return add(a,mul(r,t));};
const projectT=(p,w)=>{const v=sub(w.end,w.start),l2=dot(v,v)||1;return dot(sub(p,w.start),v)/l2};
const nextLocalId=(prefix, level)=>`${prefix}-${level}-${Date.now().toString(36)}-${Math.floor(Math.random()*1e4).toString(36)}`;

export const OPENING_FAMILIES={
  door:{single:{label:'Single Hinged',leafCount:1,swing:'inward',frame:'timber',glazing:'none'},double:{label:'Double Hinged',leafCount:2,swing:'inward',frame:'timber',glazing:'none'},sliding:{label:'Sliding Door',leafCount:2,swing:'sliding',frame:'aluminium',glazing:'clear-low-e'},garage:{label:'Sectional Garage',leafCount:1,swing:'overhead',frame:'steel',glazing:'none'}},
  'sliding-door':{single:{label:'Sliding Door',leafCount:2,swing:'sliding',frame:'aluminium',glazing:'clear-low-e'},sliding:{label:'Sliding Door',leafCount:2,swing:'sliding',frame:'aluminium',glazing:'clear-low-e'}},
  window:{casement:{label:'Casement',leafCount:2,swing:'side-hung',frame:'aluminium',glazing:'clear-low-e'},fixed:{label:'Fixed',leafCount:0,swing:'none',frame:'aluminium',glazing:'clear-low-e'},awning:{label:'Awning',leafCount:1,swing:'top-hung',frame:'aluminium',glazing:'clear-low-e'},louvre:{label:'Louvre',leafCount:1,swing:'louvre',frame:'aluminium',glazing:'obscure'}}
};

export function normalizePhase17(building){
  building.metadata ||= {}; building.metadata.schema=PHASE17_SCHEMA;
  building.phase17 ||= {schema:PHASE17_SCHEMA,wallTopology:{operations:0,lastOperation:null,joins:[]},openings:{families:{},lastEdited:null},cad:{command:null,parallelDistance:0.3}};
  building.phase17.schema=PHASE17_SCHEMA;
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    wall.topology ||= {joinStyle:'auto',joinIds:[]};
    wall.openings ||= [];
    for(const o of wall.openings){
      o.family ||= o.type==='door' || o.type==='sliding-door'?'single':'casement';
      const family=OPENING_FAMILIES[o.type]?.[o.family] || OPENING_FAMILIES[o.type]?.fixed || OPENING_FAMILIES[o.type]?.single;
      if(family){o.familyLabel ||= family.label;o.leafCount ??= family.leafCount;o.swing ||= family.swing;o.frameMaterial ||= family.frame;o.glazing ||= family.glazing;}
      o.hostWallId = wall.id;
      o.planSymbol ||= (o.type==='door' || o.type==='sliding-door')?'door-swing':'window';
    }
  }
  return building;
}
function findWall(building,levelIndex,wallId){const level=(building.levels||[]).find(l=>l.index===levelIndex);const wall=level?.walls?.find(w=>w.id===wallId);return wall?{level,wall}:null;}
function setOpeningHost(wall){const len=wallLen(wall);for(const o of wall.openings||[]){const half=Math.max(.05,Number(o.width||.9)/2);o.offsetAlongWall=clamp(Number(o.offsetAlongWall||half),half+.03,Math.max(half+.03,len-half-.03));o.hostWallId=wall.id;}}
function record(building,op){normalizePhase17(building);building.phase17.wallTopology.operations++;building.phase17.wallTopology.lastOperation={...op,timestamp:now()};}

export function classifyWallJoin(a,b,point){
  const ua=unit(sub(a.end,a.start)),ub=unit(sub(b.end,b.start));
  const c=Math.abs(cross(ua,ub)); const d=dot(ua,ub);
  return {type:c<0.08?'butt':'miter',angleDeg:Math.acos(clamp(d,-1,1))*180/Math.PI,point};
}

export function resolveWallTopology(building,{levelIndex,tolerance=.12}={}){
  normalizePhase17(building);const level=(building.levels||[]).find(l=>l.index===levelIndex);if(!level)return [];
  const walls=level.walls||[],joins=[];
  for(let i=0;i<walls.length;i++)for(let j=i+1;j<walls.length;j++){
    const a=walls[i],b=walls[j];const hit=lineIntersection(a.start,a.end,b.start,b.end);
    let point=hit;
    if(!point){for(const pa of [a.start,a.end])for(const pb of [b.start,b.end])if(dist(pa,pb)<=tolerance)point=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2];}
    if(point){const join=classifyWallJoin(a,b,point);a.topology.joinStyle=join.type;b.topology.joinStyle=join.type;joins.push({wallA:a.id,wallB:b.id,...join});}
  }
  building.phase17.wallTopology.joins=joins;record(building,{type:'resolve-wall-topology',levelIndex,count:joins.length});return joins;
}

export function createParallelWall(building,{levelIndex,wallId,distance=.3,side=1}={}){
  normalizePhase17(building);const f=findWall(building,levelIndex,wallId);if(!f)return null;const src=f.wall,u=unit(sub(src.end,src.start)),n=[u[1],-u[0]],d=mul(n,Number(distance||.3)*Number(side||1));
  const wall=clone(src);wall.id=nextLocalId('wall',levelIndex);wall.name=`${src.name||'Wall'} · Parallel`;wall.start=add(src.start,d);wall.end=add(src.end,d);wall.openings=[];wall.topology={joinStyle:'auto',joinIds:[]};wall.phase17SourceWallId=src.id;f.level.walls.push(wall);record(building,{type:'parallel-wall',sourceWallId:src.id,newWallId:wall.id,levelIndex,distance:Number(distance),side:Number(side)});resolveWallTopology(building,{levelIndex});return wall;
}

export function splitWallAt(building,{levelIndex,wallId,point}={}){
  normalizePhase17(building);const f=findWall(building,levelIndex,wallId);if(!f||!point)return null;const w=f.wall,t=projectT(point,w);if(t<=.05||t>=.95)return null;const p=add(w.start,mul(sub(w.end,w.start),t));
  const left=clone(w),right=clone(w);left.openings=[];right.openings=[];left.id=nextLocalId('wall',levelIndex);right.id=nextLocalId('wall',levelIndex);left.end=p;right.start=p;left.name=`${w.name||'Wall'} · A`;right.name=`${w.name||'Wall'} · B`;
  const splitOpenings=[];for(const o of w.openings||[]){if(Number(o.offsetAlongWall||0)/wallLen(w)<=t){o.offsetAlongWall=Number(o.offsetAlongWall||0);o.hostWallId=left.id;left.openings.push(o);}else{o.offsetAlongWall=Math.max(.05,Number(o.offsetAlongWall||0)-t*wallLen(w));o.hostWallId=right.id;right.openings.push(o);}}
  f.level.walls=f.level.walls.filter(x=>x.id!==w.id);f.level.walls.push(left,right);setOpeningHost(left);setOpeningHost(right);record(building,{type:'split-wall',wallId,levelIndex,newWallIds:[left.id,right.id],point:p});resolveWallTopology(building,{levelIndex});return {left,right,point:p};
}

export function mergeWalls(building,{levelIndex,wallAId,wallBId}={}){
  normalizePhase17(building);const level=(building.levels||[]).find(l=>l.index===levelIndex);if(!level)return null;const a=level.walls.find(w=>w.id===wallAId),b=level.walls.find(w=>w.id===wallBId);if(!a||!b)return null;
  const candidates=[[a.start,b.start,a.end,b.end],[a.start,b.end,a.end,b.start],[a.end,b.start,a.start,b.end],[a.end,b.end,a.start,b.start]];let best=null;
  for(const c of candidates){const gap=dist(c[0],c[1])+dist(c[2],c[3]);if(!best||gap<best.gap)best={gap,c};}
  if(best.gap>.3)return null;const pts=[...a.openings||[],...b.openings||[]].sort((x,y)=>(x.offsetAlongWall||0)-(y.offsetAlongWall||0));const merged=clone(a);merged.end=best.c[3];merged.openings=pts;merged.name=`${a.name||'Wall'} · Merged`;for(const o of merged.openings)o.hostWallId=merged.id;level.walls=level.walls.filter(w=>w.id!==a.id&&w.id!==b.id);level.walls.push(merged);setOpeningHost(merged);record(building,{type:'merge-walls',wallAId,wallBId,levelIndex,mergedWallId:merged.id});resolveWallTopology(building,{levelIndex});return merged;
}

export function setOpeningFamily(building,{levelIndex,wallId,openingId,family}={}){
  normalizePhase17(building);const f=findWall(building,levelIndex,wallId);const o=f?.wall.openings?.find(x=>x.id===openingId);if(!o||!OPENING_FAMILIES[o.type]?.[family])return null;const spec=OPENING_FAMILIES[o.type][family];Object.assign(o,{family,familyLabel:spec.label,leafCount:spec.leafCount,swing:spec.swing,frameMaterial:spec.frame,glazing:spec.glazing,planSymbol:(o.type==='door' || o.type==='sliding-door')?'door-swing':'window'});building.phase17.openings.lastEdited={openingId,wallId,family,timestamp:now()};return o;
}

export function openingPlanSymbol(opening,wall){
  const u=unit(sub(wall.end,wall.start)),n=[-u[1],u[0]],half=Number(opening.width||.9)/2,center=add(wall.start,mul(u,Number(opening.offsetAlongWall||half))),p1=add(center,mul(u,-half)),p2=add(center,mul(u,half));
  return (opening.type==='door' || opening.type==='sliding-door')?{type:'door',p1,p2,hinge:p1,arcRadius:half,swing:opening.swing||'inward'}:{type:'window',p1,p2,normal:n,segments:opening.leafCount>1?opening.leafCount:1};
}

export function phase17Manifest(building){normalizePhase17(building);return {schema:PHASE17_SCHEMA,wallTopology:building.phase17.wallTopology,openings:building.phase17.openings,cad:building.phase17.cad,openingFamilies:OPENING_FAMILIES,notes:['Phase 17 adds deterministic wall topology, parallel/split/merge operations and architectural opening families.','Geometry and engineering outputs require professional review.']};}
export function validatePhase17(building){normalizePhase17(building);const errors=[],warnings=[];for(const l of building.levels||[])for(const w of l.walls||[]){if(wallLen(w)<.25)errors.push(`Wall ${w.id} is shorter than 250mm.`);for(const o of w.openings||[]){if(o.hostWallId!==w.id)errors.push(`Opening ${o.id} is not hosted by wall ${w.id}.`);if(!OPENING_FAMILIES[o.type]?.[o.family])warnings.push(`Opening ${o.id} uses an unknown ${o.type} family.`);}}if(!building.phase17.wallTopology)warnings.push('Wall topology has not been initialized.');return {valid:errors.length===0,errors,warnings};}
