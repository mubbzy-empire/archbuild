import { wallLength, wallMidpoint } from './buildingModel.js';

export function bounds2D(building) {
  const pts=building.levels.flatMap(l=>l.footprint||[]); if(!pts.length) return {minX:-1,maxX:1,minZ:-1,maxZ:1};
  const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
}

function wallFacadeProjection(w, direction) {
  const horizontal=Math.abs(w.end[1]-w.start[1])<0.03;
  const front=direction==='front', rear=direction==='rear';
  const side=direction==='left'||direction==='right';
  if((front||rear)&&!horizontal) return null;
  if(side&&horizontal) return null;
  const x=horizontal?(w.start[0]+w.end[0])/2:(w.start[1]+w.end[1])/2;
  return {x,length:wallLength(w),height:w.height,y:w.baseElevation,wall:w};
}

export function elevationLines(building,direction='front') {
  const bnd=bounds2D(building), lines=[];
  for(const level of building.levels){
    lines.push({type:'level',y:level.elevation,width:direction==='front'||direction==='rear'?bnd.maxX-bnd.minX:bnd.maxZ-bnd.minZ,label:`F${level.index}`});
    for(const wall of level.walls||[]){
      const p=wallFacadeProjection(wall,direction); if(!p) continue;
      lines.push({type:'wall',...p,floor:level.index});
      for(const o of wall.openings||[]){
        const center=o.offsetAlongWall; const start=Math.max(0,center-o.width/2); const offsetCenter=start+o.width/2;
        lines.push({type:o.type,y:level.elevation,x:p.x-(p.length/2)+offsetCenter,width:o.width,height:o.height,sill:o.sillHeight||0,floor:level.index});
      }
    }
  }
  return {bounds:bnd,lines};
}

// A real section is represented as cut elements along a user-defined line.
// For orthogonal sections the engine emits intersected walls, slabs/levels,
// rooms and hosted openings with their true elevations.
export function sectionGeometry(building,axis='x',cut=0) {
  const out=[];
  for(const level of building.levels||[]){
    for(const room of level.rooms||[]){
      const pts=room.polygon||[]; const cross=pts.some(p=>axis==='x'?Math.abs(p[0]-cut)<0.08:Math.abs(p[1]-cut)<0.08);
      if(cross) out.push({type:'room',floor:level.index,name:room.name,y:level.elevation,height:room.ceilingHeight||level.height,polygon:pts});
    }
    for(const wall of level.walls||[]){
      const hit=axis==='x'
        ? (Math.min(wall.start[0],wall.end[0])<=cut+0.08 && Math.max(wall.start[0],wall.end[0])>=cut-0.08)
        : (Math.min(wall.start[1],wall.end[1])<=cut+0.08 && Math.max(wall.start[1],wall.end[1])>=cut-0.08);
      if(!hit) continue;
      const m=wallMidpoint(wall); out.push({type:'wall',floor:level.index,y:level.elevation,height:wall.height,thickness:wall.thickness,position:axis==='x'?m[1]:m[0],id:wall.id});
      (wall.openings||[]).forEach(o=>out.push({type:o.type,floor:level.index,y:level.elevation+saf(o.sillHeight),height:o.height,width:o.width,wallId:wall.id}));
    }
    out.push({type:'slab',floor:level.index,y:level.elevation,height:0.18});
  }
  return out;
}
function saf(v){return Number.isFinite(v)?v:0;}

export function planGeometry(building, levelIndex=1){
  const level=building.levels.find(l=>l.index===levelIndex)||building.levels[0]; if(!level) return null;
  return {footprint:level.footprint||[],walls:(level.walls||[]).map(w=>({id:w.id,start:w.start,end:w.end,thickness:w.thickness,type:w.type})),rooms:(level.rooms||[]).map(r=>({id:r.id,name:r.name,polygon:r.polygon})),dimensions:building.documentation?.dimensions?.filter(d=>d.level===levelIndex)||[],notes:building.documentation?.notes?.filter(n=>n.level===levelIndex)||[]};
}
