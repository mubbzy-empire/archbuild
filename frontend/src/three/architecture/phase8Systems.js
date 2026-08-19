// Phase 8 — associative documentation, edit constraints and construction authoring.
// Pure Building IR rules; no Three.js.
import { wallLength, wallVector, pointAlongWall, roomArea, nextId } from './buildingModel.js';
import { OPENING_FAMILIES } from './phase7Systems.js';

const EPS=0.001;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=(v,p=1000)=>Math.round(v*p)/p;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const line=(a,b)=>({a:[...a],b:[...b],length:round(dist(a,b),3)});

export const PHASE8_SCHEMA='archvision-bim-0.8';
export const CONSTRAINT_TYPES={wallLength:'wall-length',openingHosted:'opening-hosted',roomBoundary:'room-boundary',levelElevation:'level-elevation',dimensionAssociative:'dimension-associative'};

export function normalizePhase8Data(building){
  building.documentation ||= {};
  building.documentation.views ||= [];
  building.documentation.sheets ||= [];
  building.documentation.dimensions ||= [];
  building.documentation.tags ||= [];
  building.parametric ||= {};
  building.parametric.constraints ||= [];
  building.parametric.openingFamilies ||= {};
  building.parametric.wallAssemblies ||= {};
  building.metadata ||= {};
  building.metadata.schema=PHASE8_SCHEMA;
  for(const level of building.levels||[]){
    level.walls ||= []; level.rooms ||= []; level.components ||= [];
    level.wallJoins ||= [];
    level.planAnnotations ||= [];
    for(const wall of level.walls){
      wall.constraints ||= [];
      wall.hostedOpeningIds=(wall.openings||[]).map(o=>o.id);
      wall.geometryMode ||= 'parametric-centerline';
      for(const o of wall.openings||[]){
        o.hostWallId=wall.id;
        o.hostLevel=level.index;
        o.hostOffsetReference='wall-start';
        o.hostingStatus='hosted';
        o.family=o.family||'casement';
      }
    }
    for(const room of level.rooms){ room.boundarySource ||= 'wall-network'; room.hostLevel=level.index; }
  }
  return building;
}

export function updateHostedOpenings(wall){
  const len=wallLength(wall);
  const minReturn=0.05;
  for(const o of wall.openings||[]){
    const min=Math.max(o.width/2+minReturn, minReturn);
    const max=Math.max(min, len-o.width/2-minReturn);
    const before=o.offsetAlongWall;
    o.offsetAlongWall=clamp(Number.isFinite(before)?before:len/2,min,max);
    o.hostingStatus=(o.offsetAlongWall!==before?'clamped':'hosted');
  }
  wall.hostedOpeningIds=(wall.openings||[]).map(o=>o.id);
  return wall;
}

export function editWall(level, wallId, patch={}){
  const wall=(level.walls||[]).find(w=>w.id===wallId); if(!wall) return null;
  if(patch.start) wall.start=[Number(patch.start[0]),Number(patch.start[1])];
  if(patch.end) wall.end=[Number(patch.end[0]),Number(patch.end[1])];
  for(const k of ['thickness','height','baseElevation']) if(patch[k]!=null) wall[k]=Number(patch[k]);
  updateHostedOpenings(wall);
  return wall;
}

export function offsetWall(level, wallId, distance){
  const wall=(level.walls||[]).find(w=>w.id===wallId); if(!wall) return null;
  const [dx,dz]=wallVector(wall); const len=Math.hypot(dx,dz)||1; const nx=-dz/len,nz=dx/len;
  wall.start=[wall.start[0]+nx*distance,wall.start[1]+nz*distance];
  wall.end=[wall.end[0]+nx*distance,wall.end[1]+nz*distance];
  updateHostedOpenings(wall); return wall;
}

export function trimWallTo(level, wallId, targetWallId){
  const wall=(level.walls||[]).find(w=>w.id===wallId), target=(level.walls||[]).find(w=>w.id===targetWallId);
  if(!wall||!target) return null;
  const a=wall.start,b=wall.end,c=target.start,d=target.end;
  const rx=b[0]-a[0],rz=b[1]-a[1], sx=d[0]-c[0],sz=d[1]-c[1];
  const den=rx*sz-rz*sx; if(Math.abs(den)<EPS) return wall;
  const t=((c[0]-a[0])*sz-(c[1]-a[1])*sx)/den;
  const hit=[a[0]+t*rx,a[1]+t*rz];
  const ds=dist(hit,wall.start),de=dist(hit,wall.end);
  if(ds<de) wall.start=hit; else wall.end=hit;
  updateHostedOpenings(wall); return wall;
}

export function extendWallTo(level, wallId, targetWallId){
  const wall=(level.walls||[]).find(w=>w.id===wallId), target=(level.walls||[]).find(w=>w.id===targetWallId);
  if(!wall||!target) return null;
  return trimWallTo(level,wallId,targetWallId);
}

export function createDoorSwingAnnotation(wall, opening){
  if(!(opening.type||'').includes('door')) return null;
  const len=wallLength(wall); const p=pointAlongWall(wall,clamp(opening.offsetAlongWall,0,len));
  const radius=opening.width||0.9;
  return {id:`swing-${opening.id}`,kind:'door-swing',openingId:opening.id,wallId:wall.id,center:p,radius,hand:opening.swing||'right',hostLevel:wall.floor};
}

export function associativeDocumentation(building){
  const dimensions=[],tags=[],constraints=[];
  for(const level of building.levels||[]){
    for(const wall of level.walls||[]){
      const mid=[(wall.start[0]+wall.end[0])/2,(wall.start[1]+wall.end[1])/2];
      dimensions.push({id:`dim-${wall.id}`,kind:'wall-length',hostId:wall.id,level:level.index,...line(wall.start,wall.end),text:`${wallLength(wall).toFixed(2)} m`});
      constraints.push({id:`c-${wall.id}-length`,type:CONSTRAINT_TYPES.wallLength,hostId:wall.id,value:round(wallLength(wall),3)});
      tags.push({id:`tag-${wall.id}`,kind:'wall-tag',hostId:wall.id,level:level.index,position:mid,text:wall.id});
      for(const o of wall.openings||[]){
        const center=pointAlongWall(wall,o.offsetAlongWall||0);
        dimensions.push({id:`dim-${o.id}`,kind:'opening-width',hostId:o.id,parentId:wall.id,level:level.index,a:[center[0]-o.width/2,center[1]],b:[center[0]+o.width/2,center[1]],value:o.width,text:`${o.width.toFixed(2)} m`});
        tags.push({id:`tag-${o.id}`,kind:o.type.includes('door')?'door-tag':'window-tag',hostId:o.id,parentId:wall.id,level:level.index,position:center,text:o.id});
        constraints.push({id:`c-${o.id}-host`,type:CONSTRAINT_TYPES.openingHosted,hostId:o.id,parentId:wall.id,value:o.offsetAlongWall});
      }
    }
    for(const room of level.rooms||[]){
      const center=room.polygon?.length?room.polygon.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]).map(v=>v/room.polygon.length):[0,0];
      tags.push({id:`tag-${room.id}`,kind:'room-tag',hostId:room.id,level:level.index,position:center,text:room.name||room.type||'Room',area:round(roomArea(room),2)});
      constraints.push({id:`c-${room.id}-boundary`,type:CONSTRAINT_TYPES.roomBoundary,hostId:room.id,value:room.polygon?.length||0});
    }
  }
  return {dimensions,tags,constraints};
}

export function regenerateDocumentation(building){
  normalizePhase8Data(building);
  const d=associativeDocumentation(building);
  building.documentation.dimensions=d.dimensions;
  building.documentation.tags=d.tags;
  building.parametric.constraints=d.constraints;
  building.documentation.views=deriveViewDefinitions(building);
  building.documentation.sheets=deriveDrawingSheets(building);
  return building;
}

export function deriveViewDefinitions(building){
  return [
    ...building.levels.map(l=>({id:`PLAN-F${l.index}`,type:'plan',level:l.index,orientation:'top',scale:'1:100',source:'building-ir'})),
    {id:'ELEV-FRONT',type:'elevation',direction:'front',scale:'1:100',source:'building-ir'},
    {id:'ELEV-REAR',type:'elevation',direction:'rear',scale:'1:100',source:'building-ir'},
    {id:'ELEV-LEFT',type:'elevation',direction:'left',scale:'1:100',source:'building-ir'},
    {id:'ELEV-RIGHT',type:'elevation',direction:'right',scale:'1:100',source:'building-ir'},
    {id:'SECTION-A',type:'section',axis:'x',cut:0,scale:'1:100',source:'building-ir'},
    {id:'SECTION-B',type:'section',axis:'z',cut:0,scale:'1:100',source:'building-ir'},
  ];
}

export function deriveDrawingSheets(building){
  return [
    ...building.levels.map(l=>({id:`A-${100+l.index}`,title:`F${l.index} FLOOR PLAN`,viewId:`PLAN-F${l.index}`,scale:'1:100',discipline:'A'})),
    {id:'A-201',title:'ELEVATIONS',viewId:'ELEV-FRONT',scale:'1:100',discipline:'A'},
    {id:'A-301',title:'BUILDING SECTIONS',viewId:'SECTION-A',scale:'1:100',discipline:'A'},
    {id:'A-401',title:'DOOR / WINDOW SCHEDULE',viewId:null,scale:'-',discipline:'A'},
    {id:'M-101',title:'MEP COORDINATION PLAN',viewId:null,scale:'1:100',discipline:'MEP'},
  ];
}

export function validatePhase8(building){
  const errors=[],warnings=[];
  normalizePhase8Data(building);
  for(const level of building.levels||[]){
    for(const wall of level.walls||[]){
      if(wallLength(wall)<0.2) errors.push(`Wall ${wall.id} is too short for associative documentation.`);
      const openings=wall.openings||[];
      for(const o of openings){
        const len=wallLength(wall);
        if(o.offsetAlongWall-o.width/2< -0.001 || o.offsetAlongWall+o.width/2>len+0.001) errors.push(`Opening ${o.id} is outside host wall ${wall.id}.`);
        if(o.hostWallId!==wall.id) errors.push(`Opening ${o.id} has stale host metadata.`);
      }
    }
    for(const room of level.rooms||[]) if(roomArea(room)<1.5) warnings.push(`Room ${room.id} is under 1.5 m²; verify service/circulation intent.`);
  }
  if(!building.documentation.sheets?.length) warnings.push('No drawing sheets have been generated.');
  if(!building.documentation.views?.length) warnings.push('No model-derived views have been generated.');
  for(const route of Object.values(building.systems||{}).flatMap(s=>s.routes||[])) if(route.points?.length<2) warnings.push(`MEP route ${route.id||'unnamed'} has fewer than two points.`);
  return {valid:errors.length===0,errors,warnings};
}

export function phase8Manifest(building){
  regenerateDocumentation(building);
  return {schema:PHASE8_SCHEMA,projectId:building.id,name:building.name,views:building.documentation.views,sheets:building.documentation.sheets,dimensions:building.documentation.dimensions,tags:building.documentation.tags,constraints:building.parametric.constraints,openingFamilies:OPENING_FAMILIES,qa:validatePhase8(building)};
}
