// Phase 18 — direct 3D authoring + construction-aware component metadata.
// The Building IR remains authoritative; the 3D gizmo only produces
// deterministic edits that are committed back into the IR.
export const PHASE18_SCHEMA = 'archvision-bim-1.8';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot((b[0]-a[0]), (b[1]-a[1]));
const rotatePoint = (p,c,a) => { const x=p[0]-c[0], z=p[1]-c[1], co=Math.cos(a), si=Math.sin(a); return [c[0]+x*co-z*si, c[1]+x*si+z*co]; };

export function normalizePhase18(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE18_SCHEMA;
  building.phase18 ||= {};
  building.phase18.schema = PHASE18_SCHEMA;
  building.phase18.authoring ||= {enabled:true,transformMode:'translate',operations:0,lastOperation:null};
  building.phase18.threeD ||= {componentFamilies:0,wallLayerSolids:0,openingDetails:0,constructionView:'architectural'};
  building.phase18.associative ||= {changed:[],affected:[],lastSync:null};
  let componentFamilies = 0, wallLayerSolids = 0, openingDetails = 0;
  for(const level of building.levels||[]){
    for(const wall of level.walls||[]){
      wall.construction ||= {};
      wall.construction.layerGeometry = wall.construction.layerGeometry !== false;
      wall.construction.faceAware = true;
      if(wall.construction.layerGeometry) wallLayerSolids++;
      for(const opening of wall.openings||[]){
        opening.detail3D ||= {frame:true,reveal:true,glass:opening.type==='window',sill:opening.type==='window',swing:opening.type==='door'||opening.type==='sliding-door'};
        opening.detail3D.family = opening.family || opening.type;
        openingDetails++;
      }
    }
    for(const c of level.components||[]){
      c.authoring3D ||= {directManipulation:true,transform:'position-rotation'};
      c.construction ||= {material:c.material||'generic'};
      componentFamilies++;
    }
  }
  building.phase18.threeD.componentFamilies=componentFamilies;
  building.phase18.threeD.wallLayerSolids=wallLayerSolids;
  building.phase18.threeD.openingDetails=openingDetails;
  return building;
}

function findWall(building, levelIndex, wallId){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  const wall=level?.walls?.find(w=>w.id===wallId);
  return level&&wall?{level,wall}:null;
}
function findComponent(building, levelIndex, id){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  const component=level?.components?.find(c=>c.id===id);
  return level&&component?{level,component}:null;
}

export function apply3DTransform(building,{kind,id,levelIndex=1,delta=[0,0,0],rotationDelta=0}={}){
  normalizePhase18(building);
  const dx=Number(delta[0]||0), dz=Number(delta[2]||0), dy=Number(delta[1]||0);
  const changed=[], affected=[];
  if(kind==='wall'){
    const found=findWall(building,levelIndex,id); if(!found)return null;
    const {wall}=found;
    wall.start=[wall.start[0]+dx,wall.start[1]+dz];
    wall.end=[wall.end[0]+dx,wall.end[1]+dz];
    if(Number.isFinite(dy)&&Math.abs(dy)>1e-8) wall.baseElevation=(wall.baseElevation||0)+dy;
    changed.push(`wall:${id}:${levelIndex}`);
    for(const o of wall.openings||[]) affected.push(`opening:${o.id}:${levelIndex}`);
    for(const room of found.level.rooms||[]) if((room.boundaryWallIds||[]).includes(id)) affected.push(`room:${room.id}:${levelIndex}`);
  } else if(kind==='component'){
    const found=findComponent(building,levelIndex,id); if(!found)return null;
    const c=found.component; c.position ||= [0,0,0]; c.position=[c.position[0]+dx,c.position[1]+dy,c.position[2]+dz];
    if(Number.isFinite(rotationDelta)&&Math.abs(rotationDelta)>1e-8) c.rotation=(c.rotation||0)+rotationDelta;
    changed.push(`component:${id}:${levelIndex}`);
  } else return null;
  building.phase18.associative={changed,affected,lastSync:now()};
  building.phase18.authoring.operations=(building.phase18.authoring.operations||0)+1;
  building.phase18.authoring.lastOperation={kind,id,levelIndex,delta:[dx,dy,dz],rotationDelta,timestamp:now()};
  return building;
}

export function setPhase18TransformMode(building,mode){
  normalizePhase18(building);
  building.phase18.authoring.transformMode=mode==='rotate'?'rotate':'translate';
  return building;
}

export function setPhase18ConstructionView(building,view){
  normalizePhase18(building);
  const allowed=['architectural','construction','structure','mep'];
  building.phase18.threeD.constructionView=allowed.includes(view)?view:'architectural';
  return building;
}

export function phase18Manifest(building){
  normalizePhase18(building);
  return {schema:PHASE18_SCHEMA,project:{id:building.id,name:building.name},authoring:building.phase18.authoring,threeD:building.phase18.threeD,associative:building.phase18.associative,notes:['Phase 18 adds direct 3D authoring metadata and deterministic transform propagation.','Direct 3D transforms update the canonical Building IR; engineering and construction outputs still require professional review.']};
}

export function validatePhase18(building){
  normalizePhase18(building); const errors=[],warnings=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(dist(wall.start,wall.end)<0.25) errors.push(`Wall ${wall.id} is shorter than 250mm.`);
    for(const o of wall.openings||[]) if(o.hostWallId && o.hostWallId!==wall.id) errors.push(`Opening ${o.id} is detached from host wall ${wall.id}.`);
  }
  if(building.phase18.authoring.transformMode==='rotate' && building.phase18.authoring.operations===0) warnings.push('Rotate mode is armed but no 3D edit has been committed.');
  if(!building.phase18.threeD.wallLayerSolids) warnings.push('No layered wall solids are present.');
  return {valid:errors.length===0,errors,warnings};
}
