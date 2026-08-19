// Phase 19 — advanced 3D architectural component families and face-aware authoring.
// The canonical Building IR remains authoritative; this layer stores deterministic
// construction detail for doors/windows/walls and direct 3D family edits.
export const PHASE19_SCHEMA = 'archvision-bim-1.9';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));

export const DOOR_FAMILIES = {
  single: {label:'Single hinged', leaves:1, operation:'hinged', frame:'wood', glazing:false},
  double: {label:'Double hinged', leaves:2, operation:'hinged', frame:'wood', glazing:false},
  sliding: {label:'Sliding glazed', leaves:2, operation:'sliding', frame:'aluminium', glazing:true},
  garage: {label:'Sectional garage', leaves:1, operation:'sectional', frame:'steel', glazing:false}
};
export const WINDOW_FAMILIES = {
  casement: {label:'Casement', sashes:2, operation:'casement', frame:'aluminium', glazing:true, mullions:true},
  fixed: {label:'Fixed', sashes:1, operation:'fixed', frame:'aluminium', glazing:true, mullions:false},
  awning: {label:'Awning', sashes:1, operation:'awning', frame:'aluminium', glazing:true, mullions:false},
  louvre: {label:'Louvre', sashes:1, operation:'louvre', frame:'aluminium', glazing:false, mullions:true}
};

function findOpening(building, levelIndex, id){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  if(!level) return null;
  for(const wall of level.walls||[]){ const opening=(wall.openings||[]).find(o=>o.id===id); if(opening) return {level,wall,opening}; }
  return null;
}
function findWall(building, levelIndex, id){
  const level=(building.levels||[]).find(l=>l.index===levelIndex);
  const wall=level?.walls?.find(w=>w.id===id);
  return level&&wall?{level,wall}:null;
}

export function normalizePhase19(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE19_SCHEMA;
  building.phase19 ||= {};
  building.phase19.schema = PHASE19_SCHEMA;
  building.phase19.authoring ||= {operations:0,lastOperation:null,selectedFamily:null};
  building.phase19.families ||= {doors:0,windows:0};
  building.phase19.wallFaces ||= {enabled:true,mode:'construction'};
  building.phase19.associative ||= {changed:[],affected:[],lastSync:null};
  let doors=0, windows=0;
  for(const level of building.levels||[]){
    for(const wall of level.walls||[]){
      wall.faceGeometry ||= {enabled:true,coreCentered:true,finishFaces:true,exteriorOffset:0,interiorOffset:0};
      wall.faceGeometry.coreThickness = Number(wall.thickness||0.2);
      for(const opening of wall.openings||[]){
        const isWindow=opening.type==='window';
        const catalog=isWindow?WINDOW_FAMILIES:DOOR_FAMILIES;
        const key=opening.family && catalog[opening.family] ? opening.family : (isWindow?'casement':'single');
        opening.family=key;
        const def=catalog[key];
        opening.familyData ||= {};
        opening.familyData={...clone(def),...opening.familyData};
        opening.detail3D ||= {};
        opening.detail3D.frame=true;
        opening.detail3D.reveal=true;
        opening.detail3D.glass=!!def.glazing;
        opening.detail3D.mullions=def.mullions!==false;
        opening.detail3D.leafCount=def.leaves||def.sashes||1;
        opening.detail3D.familyLabel=def.label;
        opening.planSymbol ||= {family:key,operation:def.operation};
        if(isWindow) windows++; else doors++;
      }
    }
  }
  building.phase19.families={doors,windows};
  return building;
}

export function setOpeningFamily(building,{levelIndex,id,family}={}){
  normalizePhase19(building);
  const found=findOpening(building,levelIndex,id); if(!found) return null;
  const catalog=found.opening.type==='window'?WINDOW_FAMILIES:DOOR_FAMILIES;
  if(!catalog[family]) return null;
  const def=catalog[family];
  found.opening.family=family;
  found.opening.familyData={...clone(def)};
  found.opening.detail3D={...(found.opening.detail3D||{}),frame:true,reveal:true,glass:!!def.glazing,mullions:def.mullions!==false,leafCount:def.leaves||def.sashes||1,familyLabel:def.label};
  found.opening.planSymbol={family,operation:def.operation};
  building.phase19.authoring.operations++;
  building.phase19.authoring.selectedFamily=family;
  building.phase19.authoring.lastOperation={type:'opening-family',id,levelIndex,family,timestamp:now()};
  building.phase19.associative={changed:[`opening:${id}:${levelIndex}`],affected:[`wall:${found.wall.id}:${levelIndex}`],lastSync:now()};
  return building;
}

export function setWallFaceOffsets(building,{levelIndex,wallId,exterior=0,interior=0}={}){
  normalizePhase19(building);
  const found=findWall(building,levelIndex,wallId); if(!found) return null;
  found.wall.faceGeometry={...(found.wall.faceGeometry||{}),enabled:true,exteriorOffset:Number(exterior)||0,interiorOffset:Number(interior)||0};
  building.phase19.authoring.operations++;
  building.phase19.authoring.lastOperation={type:'wall-face-offset',wallId,levelIndex,exterior:Number(exterior)||0,interior:Number(interior)||0,timestamp:now()};
  building.phase19.associative={changed:[`wall:${wallId}:${levelIndex}`],affected:(found.wall.openings||[]).map(o=>`opening:${o.id}:${levelIndex}`),lastSync:now()};
  return building;
}

export function normalizePhase19Associativity(building){
  normalizePhase19(building);
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const opening of wall.openings||[]){
    opening.hostWallId=wall.id; opening.hostLevel=level.index;
    const len=Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]);
    const min=opening.width/2+0.05;
    opening.offsetAlongWall=Math.min(Math.max(Number(opening.offsetAlongWall)||min,min),Math.max(len-min,min));
  }
  building.phase19.associative.lastSync=now();
  return building;
}

export function phase19Manifest(building){
  normalizePhase19(building);
  return {schema:PHASE19_SCHEMA,project:{id:building.id,name:building.name},families:building.phase19.families,wallFaces:building.phase19.wallFaces,authoring:building.phase19.authoring,associative:building.phase19.associative,notes:['Phase 19 adds configurable 3D architectural opening families and face-aware wall authoring metadata.','Geometry remains derived from the canonical Building IR and should be professionally reviewed before construction use.']};
}

export function validatePhase19(building){
  normalizePhase19(building);
  const errors=[],warnings=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    if(Number(wall.thickness||0)<=0) errors.push(`Wall ${wall.id} has invalid thickness.`);
    for(const opening of wall.openings||[]){
      const catalog=opening.type==='window'?WINDOW_FAMILIES:DOOR_FAMILIES;
      if(!catalog[opening.family]) errors.push(`Opening ${opening.id} has invalid ${opening.type} family.`);
      if(!opening.hostWallId || opening.hostWallId!==wall.id) errors.push(`Opening ${opening.id} is not hosted by ${wall.id}.`);
      if(!opening.detail3D?.frame) warnings.push(`Opening ${opening.id} is missing frame detail.`);
    }
  }
  if(building.phase19.authoring.operations===0) warnings.push('No Phase 19 authoring operation has been committed yet.');
  return {valid:errors.length===0,errors,warnings};
}
