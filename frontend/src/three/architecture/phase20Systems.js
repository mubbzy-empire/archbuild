// Phase 20 — true direct 3D architectural authoring primitives.
// The canonical Building IR remains authoritative. These operations edit
// architectural faces/openings in metric units and record deterministic impact.
export const PHASE20_SCHEMA = 'archvision-bim-1.10';
const now = () => new Date().toISOString();
const clamp = (v,min,max) => Math.min(Math.max(v,min),max);
const dist = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);
const clone = v => JSON.parse(JSON.stringify(v));

function findLevel(building, levelIndex){ return (building.levels||[]).find(l=>l.index===levelIndex); }
function findWall(building, levelIndex, wallId){ const level=findLevel(building,levelIndex); const wall=level?.walls?.find(w=>w.id===wallId); return level&&wall?{level,wall}:null; }
function findOpening(building, levelIndex, openingId){
  const level=findLevel(building,levelIndex); if(!level) return null;
  for(const wall of level.walls||[]){ const opening=(wall.openings||[]).find(o=>o.id===openingId); if(opening) return {level,wall,opening}; }
  return null;
}
function normalizeOpening(opening, wall){
  const len=dist(wall.start,wall.end);
  const width=Math.max(0.25,Number(opening.width)||0.9);
  const min=Math.min(width/2+0.05,Math.max(0.1,len/2));
  opening.width=Math.min(width,Math.max(0.2,len-0.1));
  const safeMin=opening.width/2+0.05;
  opening.offsetAlongWall=clamp(Number(opening.offsetAlongWall)||safeMin,safeMin,Math.max(safeMin,len-safeMin));
  opening.height=Math.max(0.2,Number(opening.height)||2.1);
  opening.sillHeight=Math.max(0,Number(opening.sillHeight)||0);
}
function record(building, operation, changed, affected){
  building.phase20.authoring.operations=(building.phase20.authoring.operations||0)+1;
  building.phase20.authoring.lastOperation={...operation,timestamp:now()};
  building.phase20.associative={changed:[...new Set(changed)],affected:[...new Set(affected)],lastSync:now()};
  building.phase20.history ||= [];
  building.phase20.history.push({id:`P20-${building.phase20.authoring.operations}`,...operation,changed,affected,timestamp:now()});
  if(building.phase20.history.length>50) building.phase20.history=building.phase20.history.slice(-50);
}

export function normalizePhase20(building){
  building.metadata ||= {};
  building.metadata.schema=PHASE20_SCHEMA;
  building.phase20 ||= {};
  building.phase20.schema=PHASE20_SCHEMA;
  building.phase20.authoring ||= {enabled:true,operations:0,lastOperation:null,mode:'face'};
  building.phase20.associative ||= {changed:[],affected:[],lastSync:null};
  building.phase20.threeD ||= {directEditing:true,wallFaces:0,openingHandles:0,constructionView:'architectural'};
  let wallFaces=0, openingHandles=0;
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    wall.faceGeometry ||= {};
    wall.faceGeometry.enabled=true;
    wall.faceGeometry.authoring=true;
    wall.faceGeometry.exteriorFace=Number(wall.faceGeometry.exteriorFace ?? wall.faceGeometry.exteriorOffset ?? 0);
    wall.faceGeometry.interiorFace=Number(wall.faceGeometry.interiorFace ?? wall.faceGeometry.interiorOffset ?? 0);
    wall.faceGeometry.coreThickness=Number(wall.thickness)||0.2;
    wallFaces+=2;
    for(const opening of wall.openings||[]){ opening.authoring3D ||= {}; opening.authoring3D.editable=true; opening.authoring3D.jambs=true; opening.authoring3D.temporaryDimensions=true; openingHandles+=2; normalizeOpening(opening,wall); }
  }
  building.phase20.threeD.wallFaces=wallFaces;
  building.phase20.threeD.openingHandles=openingHandles;
  return building;
}

export function setPhase20Mode(building, mode='face'){
  normalizePhase20(building); const allowed=['face','opening','component'];
  building.phase20.authoring.mode=allowed.includes(mode)?mode:'face'; return building;
}

// Change wall thickness while keeping the chosen architectural face stationary.
export function editWallFace(building,{levelIndex,wallId,face='exterior',thickness}={}){
  normalizePhase20(building); const found=findWall(building,levelIndex,wallId); if(!found)return null;
  const wall=found.wall; const old=Math.max(0.05,Number(wall.thickness)||0.2); const next=clamp(Number(thickness)||old,0.08,1.2); if(Math.abs(next-old)<1e-6)return building;
  const ux=(wall.end[0]-wall.start[0])/Math.max(1e-9,dist(wall.start,wall.end)); const uz=(wall.end[1]-wall.start[1])/Math.max(1e-9,dist(wall.start,wall.end));
  const normal=[-uz,ux]; const delta=(next-old)/2*(face==='exterior'?-1:1);
  wall.start=[wall.start[0]+normal[0]*delta,wall.start[1]+normal[1]*delta]; wall.end=[wall.end[0]+normal[0]*delta,wall.end[1]+normal[1]*delta]; wall.thickness=next;
  wall.faceGeometry.coreThickness=next; wall.faceGeometry.lastEditedFace=face;
  for(const opening of wall.openings||[]) normalizeOpening(opening,wall);
  record(building,{type:'wall-face-thickness',levelIndex,wallId,face,oldThickness:old,newThickness:next},[`wall:${wallId}:${levelIndex}`],(wall.openings||[]).map(o=>`opening:${o.id}:${levelIndex}`));
  return building;
}

export function moveWallFace(building,{levelIndex,wallId,face='exterior',distance=0}={}){
  normalizePhase20(building); const found=findWall(building,levelIndex,wallId); if(!found)return null;
  const wall=found.wall; const len=dist(wall.start,wall.end); if(len<0.05)return null;
  const ux=(wall.end[0]-wall.start[0])/len, uz=(wall.end[1]-wall.start[1])/len; const n=[-uz,ux]; const d=Number(distance)||0;
  wall.faceGeometry[face==='exterior'?'exteriorFace':'interiorFace']=(Number(wall.faceGeometry[face==='exterior'?'exteriorFace':'interiorFace'])||0)+d;
  wall.start=[wall.start[0]+n[0]*d,wall.start[1]+n[1]*d]; wall.end=[wall.end[0]+n[0]*d,wall.end[1]+n[1]*d];
  for(const opening of wall.openings||[]) normalizeOpening(opening,wall);
  record(building,{type:'wall-face-move',levelIndex,wallId,face,distance:d},[`wall:${wallId}:${levelIndex}`],(wall.openings||[]).map(o=>`opening:${o.id}:${levelIndex}`));
  return building;
}

export function resizeOpening(building,{levelIndex,openingId,width,height,sillHeight}={}){
  normalizePhase20(building); const found=findOpening(building,levelIndex,openingId); if(!found)return null;
  const o=found.opening; const old={width:o.width,height:o.height,sillHeight:o.sillHeight};
  if(width!=null)o.width=Number(width); if(height!=null)o.height=Number(height); if(sillHeight!=null)o.sillHeight=Number(sillHeight);
  normalizeOpening(o,found.wall);
  record(building,{type:'opening-resize',levelIndex,openingId,old,new:{width:o.width,height:o.height,sillHeight:o.sillHeight}},[`opening:${openingId}:${levelIndex}`],[`wall:${found.wall.id}:${levelIndex}`,`room-host:${found.wall.id}:${levelIndex}`]);
  return building;
}

export function moveOpening3D(building,{levelIndex,openingId,offsetAlongWall}={}){
  normalizePhase20(building); const found=findOpening(building,levelIndex,openingId); if(!found)return null;
  found.opening.offsetAlongWall=Number(offsetAlongWall); normalizeOpening(found.opening,found.wall);
  record(building,{type:'opening-move-3d',levelIndex,openingId,offsetAlongWall:found.opening.offsetAlongWall},[`opening:${openingId}:${levelIndex}`],[`wall:${found.wall.id}:${levelIndex}`,`room-host:${found.wall.id}:${levelIndex}`]);
  return building;
}

export function phase20Manifest(building){
  normalizePhase20(building);
  return {schema:PHASE20_SCHEMA,project:{id:building.id,name:building.name},authoring:building.phase20.authoring,threeD:building.phase20.threeD,associative:building.phase20.associative,history:building.phase20.history||[],notes:['Phase 20 adds direct 3D face/opening authoring primitives to the canonical Building IR.','These are deterministic BIM/CAD editing operations; construction and engineering approval remains a professional responsibility.']};
}

export function validatePhase20(building){
  normalizePhase20(building); const errors=[],warnings=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(!Number.isFinite(Number(wall.thickness)) || wall.thickness<0.08 || wall.thickness>1.2) errors.push(`Wall ${wall.id} has invalid authored thickness.`);
    for(const opening of wall.openings||[]){
      const len=dist(wall.start,wall.end); const min=opening.width/2+0.05;
      if(opening.offsetAlongWall<min-1e-6 || opening.offsetAlongWall>len-min+1e-6) errors.push(`Opening ${opening.id} is outside its host wall after 3D authoring.`);
      if(opening.width<0.2 || opening.height<0.2) errors.push(`Opening ${opening.id} has an invalid authored size.`);
    }
  }
  if(!building.phase20.authoring.enabled) warnings.push('Direct 3D authoring is disabled.');
  if(!building.phase20.history?.length) warnings.push('No Phase 20 3D authoring operation has been committed yet.');
  return {valid:errors.length===0,errors,warnings};
}
