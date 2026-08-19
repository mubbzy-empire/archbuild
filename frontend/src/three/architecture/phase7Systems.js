// Phase 7 — architectural geometry and production systems.
// Pure CAD/BIM rules: wall offsets/joins, opening families, roof/stair QA,
// associative annotations and production-ready model diagnostics.
import { wallLength, wallVector, wallMidpoint, roomArea, nextId } from './buildingModel.js';

const EPS = 0.001;
const round = (n,p=1000)=>Math.round(n*p)/p;
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mul=(a,s)=>[a[0]*s,a[1]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const unit=v=>{const l=Math.hypot(v[0],v[1])||1;return [v[0]/l,v[1]/l];};
const leftNormal=v=>[-v[1],v[0]];

function lineIntersection(a,b,c,d){
  const r=sub(b,a), s=sub(d,c), den=cross(r,s);
  if(Math.abs(den)<EPS) return null;
  const t=cross(sub(c,a),s)/den;
  return add(a,mul(r,t));
}

export function offsetWallGeometry(wall, offset=0){
  const u=unit(wallVector(wall)), n=leftNormal(u), o=mul(n,offset);
  return {start:add(wall.start,o),end:add(wall.end,o),normal:n};
}

// Calculates a clean miter at the intersection of two walls. The result is
// data-only and is used both for CAD editing and geometry generation.
export function miterJoin(a,b, tolerance=0.08){
  const av=unit(wallVector(a)), bv=unit(wallVector(b));
  const angle=Math.acos(Math.max(-1,Math.min(1,dot(av,bv))));
  const hit=lineIntersection(a.start,a.end,b.start,b.end);
  if(!hit || angle<EPS || Math.abs(Math.PI-angle)<EPS) return {type:'butt',point:hit,angle};
  const halfA=(a.thickness||0.2)/2, halfB=(b.thickness||0.2)/2;
  const oa=offsetWallGeometry(a,halfA), ob=offsetWallGeometry(b,halfB);
  const outer=lineIntersection(oa.start,oa.end,ob.start,ob.end);
  const distance=outer?Math.hypot(outer[0]-hit[0],outer[1]-hit[1]):Infinity;
  return {type:distance<=Math.max(tolerance,Math.min(a.thickness||0.2,b.thickness||0.2)*4)?'miter':'butt',point:hit,outer,angle,mitreDistance:distance};
}

export function cleanWallJoins(level){
  const walls=level.walls||[];
  const joins=[];
  for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
    const a=walls[i],b=walls[j], hit=lineIntersection(a.start,a.end,b.start,b.end);
    if(!hit) continue;
    const nearA=Math.min(Math.hypot(hit[0]-a.start[0],hit[1]-a.start[1]),Math.hypot(hit[0]-a.end[0],hit[1]-a.end[1]))<0.12;
    const nearB=Math.min(Math.hypot(hit[0]-b.start[0],hit[1]-b.start[1]),Math.hypot(hit[0]-b.end[0],hit[1]-b.end[1]))<0.12;
    if(nearA||nearB){ const m=miterJoin(a,b); joins.push({id:nextId('join'),wallA:a.id,wallB:b.id,...m}); }
  }
  level.wallJoins=joins;
  for(const w of walls) w.joinStyle=w.joinStyle||'miter-or-butt';
  return joins;
}

export function trimExtendWall(wall, targetWall, mode='trim'){
  const hit=lineIntersection(wall.start,wall.end,targetWall.start,targetWall.end);
  if(!hit) return {...wall};
  const ds=Math.hypot(hit[0]-wall.start[0],hit[1]-wall.start[1]);
  const de=Math.hypot(hit[0]-wall.end[0],hit[1]-wall.end[1]);
  if(mode==='extend') return ds<de?{...wall,end:hit}:{...wall,start:hit};
  return ds<de?{...wall,start:hit}:{...wall,end:hit};
}

export const OPENING_FAMILIES={
  single_hinged:{category:'door',label:'Single Hinged Door',leafCount:1,frameDepth:0.12},
  double_hinged:{category:'door',label:'Double Hinged Door',leafCount:2,frameDepth:0.12},
  sliding:{category:'door',label:'Sliding Door',leafCount:2,frameDepth:0.10},
  sectional_garage:{category:'door',label:'Sectional Garage Door',leafCount:1,frameDepth:0.12},
  casement:{category:'window',label:'Casement Window',leafCount:1,frameDepth:0.10},
  fixed:{category:'window',label:'Fixed Window',leafCount:1,frameDepth:0.10},
  awning:{category:'window',label:'Awning Window',leafCount:1,frameDepth:0.10},
  louvre:{category:'window',label:'Louvre Window',leafCount:1,frameDepth:0.10},
};

export function normalizeOpeningFamilies(building){
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const o of wall.openings||[]){
    const key=o.family||((o.type||'window').includes('door')?(o.type==='sliding-door'?'sliding':o.type==='garage-door'?'sectional_garage':o.type==='french-door'?'double_hinged':'single_hinged'):(o.style==='fixed'?'fixed':o.style==='awning'?'awning':o.style==='louvre'?'louvre':'casement'));
    const family=OPENING_FAMILIES[key]||OPENING_FAMILIES.casement;
    o.family=key;o.familyLabel=family.label;o.frameDepth=o.frameDepth||family.frameDepth;o.leafCount=o.leafCount||family.leafCount;o.reveal=o.reveal||0.06;o.frameMaterial=o.frameMaterial||'aluminium';
  }
  return building;
}

export function stairProductionCheck(stair,from,to){
  const rise=Math.max(0,to.elevation-from.elevation), risers=Math.max(1,Math.round(rise/(stair.riserHeight||0.17))), r=rise/risers;
  const g=stair.treadDepth||Math.max(0.25,Math.min(0.33,0.63-2*r));
  const run=risers*g, width=stair.width||1.1;
  const headroom=Math.max(0,2.1-Math.max(0,run*0.35));
  return {risers,riserHeight:r,treadDepth:g,run,width,goingRule:2*r+g,comfortable:2*r+g>=0.59&&2*r+g<=0.67,headroomEstimate:headroom,headroomPass:headroom>=2.0};
}

export function roofPlaneSchedule(building){
  const roof=building.roof||{}; const top=building.levels?.[building.levels.length-1];
  if(!top?.footprint?.length) return [];
  const p=top.footprint, xs=p.map(x=>x[0]),zs=p.map(x=>x[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const pitch=roof.pitchDeg||0;
  if(roof.type==='flat'||roof.type==='parapet') return [{id:'RP-1',type:'flat',area:round(Math.abs(maxX-minX)*Math.abs(maxZ-minZ),2),pitchDeg:0,elevation:top.elevation+top.height}];
  const width=maxX-minX,depth=maxZ-minZ;
  const ridgeRise=Math.min(width,depth)/2*Math.tan(pitch*Math.PI/180);
  if(roof.type==='gable') return [{id:'RP-1',type:'gable-left',area:round(width*Math.hypot(depth/2,ridgeRise),2),pitchDeg:pitch},{id:'RP-2',type:'gable-right',area:round(width*Math.hypot(depth/2,ridgeRise),2),pitchDeg:pitch}];
  if(roof.type==='mono') return [{id:'RP-1',type:'mono',area:round(width*Math.hypot(depth,ridgeRise),2),pitchDeg:pitch}];
  return [{id:'RP-1',type:'hip-front',area:round(width*Math.hypot(depth/2,ridgeRise),2),pitchDeg:pitch},{id:'RP-2',type:'hip-rear',area:round(width*Math.hypot(depth/2,ridgeRise),2),pitchDeg:pitch},{id:'RP-3',type:'hip-left',area:round(depth*Math.hypot(width/2,ridgeRise),2),pitchDeg:pitch},{id:'RP-4',type:'hip-right',area:round(depth*Math.hypot(width/2,ridgeRise),2),pitchDeg:pitch}];
}

export function phase7ProductionData(building){
  normalizeOpeningFamilies(building);
  for(const level of building.levels||[]) cleanWallJoins(level);
  building.roofPlanes=roofPlaneSchedule(building);
  building.stairProduction=(building.stairs||[]).map(s=>{const from=building.levels.find(l=>l.index===s.fromFloor),to=building.levels.find(l=>l.index===s.toFloor);return from&&to?{id:s.id,...stairProductionCheck(s,from,to)}:{id:s.id,valid:false};});
  building.documentation ||= {};
  building.documentation.production ||= {};
  building.documentation.production.wallJoins=(building.levels||[]).flatMap(l=>l.wallJoins||[]);
  building.documentation.production.roofPlanes=building.roofPlanes;
  building.documentation.production.stairs=building.stairProduction;
  return building;
}

export function validatePhase7(building){
  const errors=[],warnings=[];
  for(const level of building.levels||[]){
    for(const w of level.walls||[]){
      const len=wallLength(w); if(len<0.15) errors.push(`Wall ${w.id} is too short for reliable architectural authoring.`);
      for(const o of w.openings||[]) if(o.width>len-0.1) errors.push(`Opening ${o.id} leaves insufficient wall return on ${w.id}.`);
    }
    for(const r of level.rooms||[]) if(roomArea(r)<2) warnings.push(`Room ${r.id} is below 2 m²; verify whether it is a service/circulation space.`);
  }
  for(const s of building.stairProduction||[]) {if(!s.headroomPass) warnings.push(`Stair ${s.id} has estimated headroom below 2.0 m; verify the actual section.`);if(!s.comfortable) warnings.push(`Stair ${s.id} fails the 2R+G comfort check.`);}
  if((building.roofPlanes||[]).some(p=>!Number.isFinite(p.area)||p.area<=0)) errors.push('Roof plane schedule contains an invalid area.');
  return {valid:errors.length===0,errors,warnings};
}

export const PHASE7_SCHEMA='archvision-bim-0.7';
export function phase7Manifest(building){
  phase7ProductionData(building);
  return {schema:PHASE7_SCHEMA,projectId:building.id,name:building.name,wallJoins:building.documentation?.production?.wallJoins||[],openingFamilies:OPENING_FAMILIES,roofPlanes:building.roofPlanes||[],stairs:building.stairProduction||[],qa:validatePhase7(building)};
}
