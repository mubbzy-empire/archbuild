import { nextId, wallLength, roomArea } from './buildingModel.js';

export const PHASE10_SCHEMA = 'archvision-bim-1.0';

const clone = v => JSON.parse(JSON.stringify(v));
const bounds = pts => { const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)}; };
const centroid = pts => pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]).map(v=>v/(pts.length||1));

export function normalizePhase10(building) {
  building.metadata ||= {};
  building.metadata.schema = PHASE10_SCHEMA;
  building.bim ||= {};
  building.bim.spatial ||= { projectId: building.id, siteId: `${building.id}-site`, buildingId: building.id };
  building.bim.propertySets ||= {};
  building.structural ||= {};
  building.structural.grid ||= { spacingX: 4, spacingZ: 4, labelsX: [], labelsZ: [] };
  building.structural.foundations ||= [];
  building.structural.beams ||= [];
  building.structural.columns ||= [];
  building.structural.levels ||= [];
  building.roof ||= {};
  building.roof.planes ||= [];
  building.roof.details ||= { fascia: true, gutters: true, thickness: 0.12, ridge: true, valleys: true };
  building.roof.openings ||= [];
  building.ceilingSystems ||= [];
  building.materials ||= {};
  building.materials.assemblies ||= {};
  building.systems ||= {};
  for (const k of ['electrical','plumbing','drainage','hvac','fire']) { building.systems[k] ||= {}; building.systems[k].routes ||= []; }
  building.systems.electrical.circuits ||= [];
  building.systems.plumbing.fixtures ||= [];
  building.systems.drainage.stacks ||= [];
  building.systems.hvac.equipment ||= [];
  building.systems.fire.devices ||= [];
  building.documentation ||= {};
  building.documentation.ifc ||= { version:'IFC4', exportReady:false };
  return building;
}

export function deriveStructuralGrid(building, spacingX=4, spacingZ=4) {
  normalizePhase10(building);
  const top = building.levels?.[0]?.footprint || [];
  if (top.length < 3) return building.structural.grid;
  const b=bounds(top); const xs=[]; const zs=[];
  for(let x=Math.ceil(b.minX/spacingX)*spacingX; x<=b.maxX+1e-6; x+=spacingX) xs.push(Number(x.toFixed(3)));
  for(let z=Math.ceil(b.minZ/spacingZ)*spacingZ; z<=b.maxZ+1e-6; z+=spacingZ) zs.push(Number(z.toFixed(3)));
  building.structural.grid={spacingX,spacingZ,labelsX:xs.map((_,i)=>String.fromCharCode(65+i)),labelsZ:zs.map((_,i)=>String(i+1)),x:xs,z:zs};
  building.datums ||= {}; building.datums.structuralGrid=clone(building.structural.grid);
  return building.structural.grid;
}

export function deriveFoundationSchedule(building) {
  normalizePhase10(building); const foundations=[];
  const ground=building.levels?.[0]; if(!ground) return foundations;
  for(const w of ground.walls||[]) if(w.type!=='parapet') foundations.push({id:`FND-${foundations.length+1}`,type:'strip',host:w.id,width:Math.max(0.55,w.thickness+0.25),depth:0.3,elevation:-0.3,length:wallLength(w)});
  for(const c of ground.components||[]) if(c.type==='column') foundations.push({id:`PAD-${foundations.length+1}`,type:'pad',host:c.id,width:Math.max(0.6,(c.size?.[0]||.3)+.3),depth:Math.max(0.6,(c.size?.[2]||.3)+.3),thickness:.3,elevation:-.3});
  building.structural.foundations=foundations; return foundations;
}

export function deriveRoofConstruction(building) {
  normalizePhase10(building); const top=building.levels?.at(-1); if(!top?.footprint?.length) return [];
  const b=bounds(top.footprint); const roof=building.roof; const over=roof.overhang??.5; const cx=(b.minX+b.maxX)/2, cz=(b.minZ+b.maxZ)/2;
  const pitch=Number(roof.pitchDeg||0)*Math.PI/180; const rise=Math.max(0,Math.min(b.maxX-b.minX,b.maxZ-b.minZ)/2*Math.tan(pitch));
  const planes=[];
  const add=(id,poly,type,base,apex)=>planes.push({id,polygon:poly,type,pitchDeg:roof.pitchDeg||0,baseElevation:top.elevation+top.height,apexElevation:top.elevation+top.height+apex,area:Math.abs(polygonArea(poly))});
  const x0=b.minX-over,x1=b.maxX+over,z0=b.minZ-over,z1=b.maxZ+over;
  if(['flat','parapet'].includes(roof.type)){ add('RF-01',[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],'flat',0,0); }
  else if(roof.type==='mono'){ add('RF-01',[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],'mono',0,rise); }
  else if(roof.type==='gable'){
    add('RF-01',[[x0,z0],[x1,z0],[cx,z0+(z1-z0)/2]],'gable-south',0,rise);
    add('RF-02',[[x1,z1],[x0,z1],[cx,z0+(z1-z0)/2]],'gable-north',0,rise);
  } else {
    add('RF-01',[[x0,z0],[x1,z0],[cx,cz]],'hip-south',0,rise);
    add('RF-02',[[x1,z0],[x1,z1],[cx,cz]],'hip-east',0,rise);
    add('RF-03',[[x1,z1],[x0,z1],[cx,cz]],'hip-north',0,rise);
    add('RF-04',[[x0,z1],[x0,z0],[cx,cz]],'hip-west',0,rise);
  }
  roof.planes=planes; roof.details={...(roof.details||{}),ridge:!['flat','parapet','mono'].includes(roof.type),valleys:roof.type==='hip',fascia:true,gutters:true,thickness:roof.details?.thickness??.12};
  return planes;
}
function polygonArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1]}return a/2}

export function deriveCeilingSystems(building) {
  normalizePhase10(building); const systems=[];
  for(const level of building.levels||[]) for(const room of level.rooms||[]) {
    if((room.polygon||[]).length<3) continue;
    const a=roomArea(room); systems.push({id:`CLG-${room.id}`,roomId:room.id,level:level.index,type:room.ceilingType||'suspended-grid',elevation:level.elevation+(room.ceilingHeight||level.height)-.05,area:Number(a.toFixed(3)),gridSpacing:room.ceilingGridSpacing||.6,finish:room.ceilingFinish||'painted-plasterboard',bulkheads:room.bulkheads||[]});
  }
  building.ceilingSystems=systems; return systems;
}

export function deriveConstructionAssemblies(building) {
  normalizePhase10(building); const assemblies={
    'W-EXT-200':{name:'External wall 200mm',category:'Wall',layers:[['render',.015],['blockwork',.15],['plaster',.015]],thermal:'design-intent'},
    'W-INT-100':{name:'Internal partition 100mm',category:'Wall',layers:[['plasterboard',.0125],['stud',.075],['plasterboard',.0125]],thermal:'design-intent'},
    'FL-RC-180':{name:'RC floor + tile',category:'Floor',layers:[['tile',.01],['screed',.05],['reinforced-concrete',.18]],thermal:'design-intent'},
    'RF-MET-120':{name:'Metal pitched roof',category:'Roof',layers:[['metal-sheet',.001],['membrane',.005],['purlin',.1],['insulation',.08]],thermal:'design-intent'},
    'CLG-PL-012':{name:'Plasterboard ceiling',category:'Ceiling',layers:[['paint',.001],['plasterboard',.0125],['void',.15]],thermal:'design-intent'},
  };
  for(const [k,v] of Object.entries(assemblies)) building.materials.assemblies[k]=v;
  return assemblies;
}

export function deriveMepCoordination(building) {
  normalizePhase10(building);
  for(const level of building.levels||[]) {
    const rooms=level.rooms||[]; const wet=rooms.filter(r=>/bath|toilet|kitchen|laundry/i.test(r.name||''));
    const service=wet[0]||rooms[0]; if(!service) continue; const c=centroid(service.polygon||[[0,0]]); const y=level.elevation+0.35;
    if(!building.systems.plumbing.routes.some(r=>r.level===level.index&&r.type==='supply-main')) building.systems.plumbing.routes.push({id:`P-${level.index}-SUP`,type:'supply-main',level:level.index,points:[[c[0],y,c[1]],[c[0]+1,y,c[1]]]});
    if(!building.systems.drainage.routes.some(r=>r.level===level.index&&r.type==='soil-main')) building.systems.drainage.routes.push({id:`D-${level.index}-SOIL`,type:'soil-main',level:level.index,points:[[c[0]+.12,y,c[1]],[c[0]+.12,y,c[1]+1]]});
    if(!building.systems.electrical.routes.some(r=>r.level===level.index&&r.type==='lighting-circuit')) building.systems.electrical.routes.push({id:`E-${level.index}-L1`,type:'lighting-circuit',level:level.index,elevation:level.elevation+level.height-.12,points:[[c[0],level.elevation+level.height-.12,c[1]],[c[0]+1.2,level.elevation+level.height-.12,c[1]]]});
    if(!building.systems.hvac.routes.some(r=>r.level===level.index&&r.type==='supply-air')) building.systems.hvac.routes.push({id:`H-${level.index}-SUP`,type:'supply-air',level:level.index,elevation:level.elevation+level.height-.18,points:[[c[0],level.elevation+level.height-.18,c[1]],[c[0]-.8,level.elevation+level.height-.18,c[1]]]});
  }
  return building.systems;
}

export function deriveIfcData(building) {
  normalizePhase10(building); const elements=[];
  for(const level of building.levels||[]) {
    elements.push({id:level.id,globalId:level.bim?.globalId||level.id,type:'IfcBuildingStorey',name:`Floor ${level.index}`,elevation:level.elevation});
    for(const w of level.walls||[]) elements.push({id:w.id,globalId:w.bim?.globalId||w.id,type:'IfcWall',hostLevel:level.id,propertySets:{Pset_WallCommon:{Reference:w.type,LoadBearing:w.type==='exterior'}}});
    for(const r of level.rooms||[]) elements.push({id:r.id,globalId:r.bim?.globalId||r.id,type:'IfcSpace',hostLevel:level.id,propertySets:{Pset_SpaceCommon:{Name:r.name,NetArea:roomArea(r)}}});
    for(const w of level.walls||[]) for(const o of w.openings||[]) elements.push({id:o.id,globalId:o.bim?.globalId||o.id,type:o.type.includes('door')?'IfcDoor':'IfcWindow',hostWall:w.id,propertySets:{Pset_DoorWindowCommon:{Width:o.width,Height:o.height,FireRating:o.fireRating||null}}});
  }
  building.documentation.ifc={version:'IFC4',exportReady:true,spatial:building.bim.spatial,elements}; return building.documentation.ifc;
}

export function phase10Manifest(building) {
  normalizePhase10(building); deriveStructuralGrid(building,building.structural.grid.spacingX,building.structural.grid.spacingZ); deriveFoundationSchedule(building); deriveRoofConstruction(building); deriveCeilingSystems(building); deriveConstructionAssemblies(building); deriveMepCoordination(building); deriveIfcData(building);
  return {schema:PHASE10_SCHEMA,project:{id:building.id,name:building.name},spatial:building.bim.spatial,structural:{grid:building.structural.grid,foundations:building.structural.foundations},roof:building.roof,ceilings:building.ceilingSystems,materials:building.materials.assemblies,systems:building.systems,ifc:building.documentation.ifc,note:'Phase 10 IFC-ready production manifest; not a certified IFC STEP file.'};
}

export function validatePhase10(building) {
  normalizePhase10(building); const errors=[],warnings=[];
  if(!building.levels?.length) errors.push('No building storeys defined.');
  if(!building.structural.grid?.x?.length) warnings.push('Structural grid has not been generated.');
  if(!building.structural.foundations?.length) warnings.push('No foundation instances were derived.');
  if(!building.roof.planes?.length) warnings.push('Roof construction planes are not derived.');
  if((building.ceilingSystems||[]).length < (building.levels||[]).reduce((n,l)=>n+(l.rooms||[]).length,0)) warnings.push('Some rooms do not have ceiling systems.');
  for(const level of building.levels||[]) for(const w of level.walls||[]) if(w.thickness<=0||w.height<=0) errors.push(`Wall ${w.id} has invalid construction dimensions.`);
  for(const [name,s] of Object.entries(building.systems||{})) for(const r of s.routes||[]) if((r.points||[]).length<2) warnings.push(`${name} route ${r.id||'unnamed'} needs at least two points.`);
  return {valid:errors.length===0,errors,warnings};
}
