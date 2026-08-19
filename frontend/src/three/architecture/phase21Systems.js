// Phase 21 — architectural topology and face-aware geometry authoring.
// The Building IR remains authoritative; this layer computes deterministic
// wall-face geometry, joins and construction-layer solids from that IR.
import * as THREE from 'three';
import { wallLength } from './buildingModel.js';

export const PHASE21_SCHEMA = 'archvision-bim-1.11';
const now=()=>new Date().toISOString();
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const clone=v=>JSON.parse(JSON.stringify(v));

function normal(wall){
  const dx=wall.end[0]-wall.start[0], dz=wall.end[1]-wall.start[1];
  const len=Math.hypot(dx,dz)||1;
  return [-dz/len, dx/len];
}
function wallRef(levelIndex,wallId){ return `wall:${wallId}:${levelIndex}`; }

export function normalizePhase21(building){
  building.metadata ||= {};
  building.metadata.schema=PHASE21_SCHEMA;
  building.phase21 ||= {};
  building.phase21.schema=PHASE21_SCHEMA;
  building.phase21.topology ||= {joins:[],operations:0,lastOperation:null};
  building.phase21.topology.joins=[];
  building.phase21.geometry ||= {layerSolids:true,faceAuthoring:true,joinCleanup:true};
  for(const level of building.levels||[]){
    level.phase21 ||= {};
    level.phase21.joins=[];
    const walls=level.walls||[];
    for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
      const a=walls[i],b=walls[j];
      const pairs=[[a.start,b.start],[a.start,b.end],[a.end,b.start],[a.end,b.end]];
      let best=Infinity;
      for(const [p,q] of pairs) best=Math.min(best,Math.hypot(p[0]-q[0],p[1]-q[1]));
      const hit=best<0.08;
      const intersects=segmentsIntersect(a.start,a.end,b.start,b.end);
      if(hit||intersects) level.phase21.joins.push({
        a:a.id,b:b.id,type:classifyJoin(a,b),distance:Number(best.toFixed(4)),
        intersection:intersects
      });
    }
    building.phase21.topology.joins.push(...level.phase21.joins.map(j=>({...j,levelIndex:level.index})));
  }
  return building;
}

function orient(a,b,c){ return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
function onSeg(a,b,p){ return Math.min(a[0],b[0])-1e-7<=p[0]&&p[0]<=Math.max(a[0],b[0])+1e-7&&Math.min(a[1],b[1])-1e-7<=p[1]&&p[1]<=Math.max(a[1],b[1])+1e-7; }
function segmentsIntersect(a,b,c,d){
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  if((o1>1e-7&&o2<-1e-7||o1<-1e-7&&o2>1e-7)&&(o3>1e-7&&o4<-1e-7||o3<-1e-7&&o4>1e-7)) return true;
  return Math.abs(o1)<1e-7&&onSeg(a,b,c)||Math.abs(o2)<1e-7&&onSeg(a,b,d)||Math.abs(o3)<1e-7&&onSeg(c,d,a)||Math.abs(o4)<1e-7&&onSeg(c,d,b);
}
function classifyJoin(a,b){
  const va=[a.end[0]-a.start[0],a.end[1]-a.start[1]], vb=[b.end[0]-b.start[0],b.end[1]-b.start[1]];
  const dot=va[0]*vb[0]+va[1]*vb[1], la=Math.hypot(...va)||1,lb=Math.hypot(...vb)||1;
  return Math.abs(dot/(la*lb))>0.94?'butt':'miter';
}

export function moveWallFace21(building,{levelIndex,wallId,face='exterior',distance=0}={}){
  normalizePhase21(building);
  const level=(building.levels||[]).find(l=>l.index===levelIndex), wall=level?.walls?.find(w=>w.id===wallId);
  if(!wall) return null;
  const d=Number(distance)||0, n=normal(wall), sign=face==='interior'?-1:1;
  const old={start:clone(wall.start),end:clone(wall.end),thickness:wall.thickness};
  const t=clamp(Number(wall.thickness)+d,0.08,1.2);
  const actual=t-Number(wall.thickness);
  const shift=actual/2*sign;
  wall.start=[wall.start[0]+n[0]*shift,wall.start[1]+n[1]*shift];
  wall.end=[wall.end[0]+n[0]*shift,wall.end[1]+n[1]*shift];
  wall.thickness=t;
  wall.faceGeometry ||= {};
  wall.faceGeometry.phase21={face,distance:actual,normal:n,editedAt:now()};
  building.phase21.topology.operations++;
  building.phase21.topology.lastOperation={type:'move-wall-face',levelIndex,wallId,face,distance:actual,old,timestamp:now()};
  return building;
}

export function offsetWallFace21(building,{levelIndex,wallId,distance=0,side='exterior'}={}){
  return moveWallFace21(building,{levelIndex,wallId,distance,face:side});
}

export function cleanupWallTopology21(building,levelIndex){
  normalizePhase21(building);
  const level=(building.levels||[]).find(l=>l.index===levelIndex); if(!level)return building;
  const walls=level.walls||[];
  for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
    const a=walls[i],b=walls[j];
    const pairs=[['start','start'],['start','end'],['end','start'],['end','end']];
    for(const [ka,kb] of pairs){
      const p=a[ka],q=b[kb]; if(Math.hypot(p[0]-q[0],p[1]-q[1])<0.08){
        const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2]; a[ka]=[...mid]; b[kb]=[...mid];
      }
    }
  }
  normalizePhase21(building);
  return building;
}

export function deriveWallFaceGeometry21(wall){
  const n=normal(wall), t=Math.max(.08,Number(wall.thickness)||.2), h=Math.max(.1,Number(wall.height)||3);
  const half=t/2;
  return {
    exterior:[wall.start.map((v,i)=>v+n[i]*half),wall.end.map((v,i)=>v+n[i]*half)],
    interior:[wall.start.map((v,i)=>v-n[i]*half),wall.end.map((v,i)=>v-n[i]*half)],
    normal:n,height:h,thickness:t
  };
}

export function deriveLayerSolids21(wall){
  const layers=wall.assembly?.layers||wall.materialAssembly?.layers||[];
  if(!layers.length) return [{id:'core',thickness:Number(wall.thickness)||.2,material:wall.material||'wall'}];
  const total=layers.reduce((s,l)=>s+(Number(l.thickness)||0),0)||Number(wall.thickness)||.2;
  return layers.map((l,i)=>({id:l.id||`layer-${i+1}`,thickness:(Number(l.thickness)||0)*((Number(wall.thickness)||.2)/total),material:l.material||l.name||'construction'}));
}

export function phase21Manifest(building){
  normalizePhase21(building);
  return {schema:PHASE21_SCHEMA,project:{id:building.id,name:building.name},topology:building.phase21.topology,geometry:building.phase21.geometry,levels:(building.levels||[]).map(l=>({index:l.index,joins:l.phase21?.joins||[]})),notes:['Phase 21 adds face-aware wall topology and deterministic construction-layer geometry.','Geometry is design-authoring data, not structural engineering certification.']};
}

export function validatePhase21(building){
  normalizePhase21(building);
  const errors=[],warnings=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(wallLength(wall)<0.25) errors.push(`Wall ${wall.id} is shorter than the Phase 21 minimum.`);
    const layers=deriveLayerSolids21(wall);
    const sum=layers.reduce((s,l)=>s+l.thickness,0);
    if(Math.abs(sum-(Number(wall.thickness)||0.2))>0.002) warnings.push(`Wall ${wall.id} construction layers do not exactly sum to thickness.`);
  }
  return {valid:errors.length===0,errors,warnings};
}
