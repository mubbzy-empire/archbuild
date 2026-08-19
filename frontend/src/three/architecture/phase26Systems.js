// Phase 26 — construction materials, assemblies and professional quantity takeoff.
// Quantities are deterministic model-derived estimates. They are not procurement,
// structural design or certified cost estimates.
export const PHASE26_SCHEMA = 'archvision-bim-1.16';
const clone=v=>JSON.parse(JSON.stringify(v));
const round=(v,d=3)=>Number((Number(v)||0).toFixed(d));
const now=()=>new Date().toISOString();
const polygonArea=p=>{let a=0;for(let i=0;i<(p||[]).length;i++){const q=p[(i+1)%p.length];a+=(p[i][0]*q[1]-q[0]*p[i][1]);}return Math.abs(a)/2;};
const wallLength=w=>Math.hypot((w?.end?.[0]||0)-(w?.start?.[0]||0),(w?.end?.[1]||0)-(w?.start?.[1]||0));
const materialCatalog={
  render:{name:'External render',unit:'m²',densityKgM3:1800,defaultWaste:0.08},
  blockwork:{name:'Concrete blockwork',unit:'m³',densityKgM3:1900,defaultWaste:0.05},
  insulation:{name:'Thermal insulation',unit:'m³',densityKgM3:35,defaultWaste:0.07},
  plaster:{name:'Internal plaster',unit:'m²',densityKgM3:1000,defaultWaste:0.08},
  plasterboard:{name:'Plasterboard',unit:'m²',densityKgM3:800,defaultWaste:0.08},
  tile:{name:'Floor tile',unit:'m²',defaultWaste:0.10},
  screed:{name:'Cement screed',unit:'m³',densityKgM3:2100,defaultWaste:0.05},
  reinforcedConcrete:{name:'Reinforced concrete',unit:'m³',densityKgM3:2400,defaultWaste:0.05},
  paint:{name:'Paint finish',unit:'m²',defaultWaste:0.08},
  metalSheet:{name:'Metal roofing sheet',unit:'m²',defaultWaste:0.10},
  membrane:{name:'Roof membrane',unit:'m²',defaultWaste:0.08},
  insulationRoof:{name:'Roof insulation',unit:'m³',densityKgM3:35,defaultWaste:0.07},
  roofDeck:{name:'Roof deck',unit:'m²',defaultWaste:0.07},
  waterproofing:{name:'Roof waterproofing',unit:'m²',defaultWaste:0.08},
  glass:{name:'Glazing',unit:'m²',defaultWaste:0.05},
  doorFrame:{name:'Door frame',unit:'m',defaultWaste:0.05},
  windowFrame:{name:'Window frame',unit:'m',defaultWaste:0.05},
  skirting:{name:'Skirting',unit:'m',defaultWaste:0.08}
};
const assemblies={
  extWall:{name:'External wall',layers:[['render',0.015,'area'],['blockwork',0.15,'volume'],['insulation',0.075,'volume'],['plaster',0.015,'area']]},
  intWall:{name:'Internal partition',layers:[['plasterboard',0.0125,'area'],['blockwork',0.075,'volume'],['plasterboard',0.0125,'area']]},
  floor:{name:'Floor build-up',layers:[['tile',0.012,'area'],['screed',0.05,'volume'],['reinforcedConcrete',0.18,'volume']]},
  roof:{name:'Pitched roof build-up',layers:[['metalSheet',0.01,'area'],['membrane',0.005,'area'],['insulationRoof',0.08,'volume'],['roofDeck',0.018,'area']]},
  flatRoof:{name:'Flat roof build-up',layers:[['waterproofing',0.006,'area'],['screed',0.05,'volume'],['reinforcedConcrete',0.15,'volume']]},
  ceiling:{name:'Plasterboard ceiling',layers:[['paint',0.001,'area'],['plasterboard',0.0125,'area']]}
};
function openingArea(o){return Math.max(0,Number(o?.width||0)*Number(o?.height||0));}
function floorArea(level){return (level?.rooms||[]).reduce((s,r)=>s+polygonArea(r.polygon),0);}
function roofArea(building){const planes=building.roof?.planes||[];if(planes.length)return planes.reduce((s,p)=>s+Math.abs(Number(p.area)||0),0);const top=building.levels?.at(-1);return floorArea(top);}
function addItem(map,key,quantity,unit,meta={}){if(!quantity||quantity<=0)return;const c=materialCatalog[key]||{name:key,unit};const item=map.get(key)||{key,name:c.name,unit:unit||c.unit,quantity:0,wasteRate:c.defaultWaste??0.05,category:meta.category||'Construction',densityKgM3:c.densityKgM3||null};item.quantity+=quantity;map.set(key,item);}
function wallGross(w){return wallLength(w)*Number(w.height||0);}
function wallNetArea(w){return Math.max(0,wallGross(w)-(w.openings||[]).reduce((s,o)=>s+openingArea(o),0));}
function deriveWallTakeoff(building,map,assembliesOut){for(const level of building.levels||[])for(const w of level.walls||[]){const net=wallNetArea(w);const len=wallLength(w);const isInt=w.type==='interior'||w.type==='partition';const a=isInt?assemblies.intWall:assemblies.extWall;assembliesOut.push({id:`ASM-${w.id}`,elementId:w.id,level:level.index,type:'wall',assembly:isInt?'intWall':'extWall',netAreaM2:round(net),lengthM:round(len),layers:a.layers.map(([k,t,mode])=>({material:k,thicknessM:t,measure:mode,quantity:round(mode==='area'?net:net*t),unit:materialCatalog[k].unit}))});for(const [k,t,mode] of a.layers){const q=mode==='area'?net:net*t;addItem(map,k,q,materialCatalog[k].unit,{category:'Wall'});}}}
function deriveFloorTakeoff(building,map,assembliesOut){for(const level of building.levels||[]){const area=floorArea(level);if(!area)continue;const a=assemblies.floor;assembliesOut.push({id:`ASM-FL-${level.index}`,elementId:level.id,level:level.index,type:'floor',assembly:'floor',areaM2:round(area),layers:a.layers.map(([k,t,mode])=>({material:k,thicknessM:t,measure:mode,quantity:round(mode==='area'?area:area*t),unit:materialCatalog[k].unit}))});for(const [k,t,mode] of a.layers)addItem(map,k,mode==='area'?area:area*t,materialCatalog[k].unit,{category:'Floor'});}}
function deriveRoofTakeoff(building,map,assembliesOut){const area=roofArea(building);if(!area)return;const flat=['flat','parapet'].includes(building.roof?.type);const a=flat?assemblies.flatRoof:assemblies.roof;assembliesOut.push({id:'ASM-ROOF',elementId:building.id,level:building.levels?.at(-1)?.index||1,type:'roof',assembly:flat?'flatRoof':'roof',areaM2:round(area),layers:a.layers.map(([k,t,mode])=>({material:k,thicknessM:t,measure:mode,quantity:round(mode==='area'?area:area*t),unit:materialCatalog[k].unit}))});for(const [k,t,mode] of a.layers)addItem(map,k,mode==='area'?area:area*t,materialCatalog[k].unit,{category:'Roof'});}
function deriveCeilingTakeoff(building,map,assembliesOut){for(const level of building.levels||[])for(const room of level.rooms||[]){const area=polygonArea(room.polygon);if(!area)continue;const a=assemblies.ceiling;assembliesOut.push({id:`ASM-CLG-${room.id}`,elementId:room.id,level:level.index,type:'ceiling',assembly:'ceiling',areaM2:round(area),layers:a.layers.map(([k,t,mode])=>({material:k,thicknessM:t,measure:mode,quantity:round(mode==='area'?area:area*t),unit:materialCatalog[k].unit}))});for(const [k,t,mode] of a.layers)addItem(map,k,mode==='area'?area:area*t,materialCatalog[k].unit,{category:'Ceiling'});}}
function deriveOpenings(building,map){let doors=0,windows=0,glazing=0,frames=0;for(const l of building.levels||[])for(const w of l.walls||[])for(const o of w.openings||[]){const a=openingArea(o);const perimeter=2*(Number(o.width||0)+Number(o.height||0));if(/door/i.test(o.type||'')){doors++;addItem(map,'doorFrame',perimeter,'m',{category:'Openings'});}else{windows++;glazing+=a;frames+=perimeter;addItem(map,'glass',a,'m²',{category:'Openings'});addItem(map,'windowFrame',perimeter,'m',{category:'Openings'});}}return {doors,windows,glazingM2:glazing,frameLengthM:frames};}
function applyWaste(items){return items.map(i=>({...i,grossQuantity:round(i.quantity*(1+i.wasteRate)),wasteQuantity:round(i.quantity*i.wasteRate),estimatedWeightKg:i.densityKgM3&&i.unit==='m³'?round(i.quantity*(1+i.wasteRate)*i.densityKgM3):null}));}
export function normalizePhase26(building){building.metadata ||= {};building.metadata.schema=PHASE26_SCHEMA;building.phase26 ||= {};const p=building.phase26;p.schema=PHASE26_SCHEMA;p.materialCatalog ||= clone(materialCatalog);p.assemblies ||= clone(assemblies);p.items ||= [];p.assembliesTakeoff ||= [];p.elementTakeoff ||= [];p.openings ||= {};p.summary ||= {};p.operations ||= 0;p.updatedAt ||= null;p.associative ||= {};return building;}
export function regeneratePhase26(building,reason='phase26-material-takeoff'){normalizePhase26(building);const p=building.phase26;const map=new Map();const assemblyRows=[];deriveWallTakeoff(building,map,assemblyRows);deriveFloorTakeoff(building,map,assemblyRows);deriveRoofTakeoff(building,map,assemblyRows);deriveCeilingTakeoff(building,map,assemblyRows);p.openings=deriveOpenings(building,map);p.assembliesTakeoff=assemblyRows;p.items=applyWaste([...map.values()].map(i=>({...i,quantity:round(i.quantity)})));p.elementTakeoff=(building.levels||[]).flatMap(l=>(l.walls||[]).map(w=>({elementId:w.id,level:l.index,type:'wall',grossAreaM2:round(wallGross(w)),netAreaM2:round(wallNetArea(w)),lengthM:round(wallLength(w)),openings:(w.openings||[]).length})));const floorTotal=(building.levels||[]).reduce((s,l)=>s+floorArea(l),0);p.summary={floorAreaM2:round(floorTotal),wallNetAreaM2:round(p.elementTakeoff.reduce((s,x)=>s+x.netAreaM2,0)),roofAreaM2:round(roofArea(building)),doorCount:p.openings.doors||0,windowCount:p.openings.windows||0,materialCount:p.items.length,assemblyCount:p.assembliesTakeoff.length};p.operations++;p.updatedAt=now();p.reason=reason;p.associative={materials:p.items.length,assemblies:p.assembliesTakeoff.length,modelDerived:true};return building;}
export function validatePhase26(building){normalizePhase26(building);const p=building.phase26,errors=[],warnings=[];if(!p.updatedAt)warnings.push('Phase 26 takeoff has not been regenerated.');for(const i of p.items||[]){if(!i.key)errors.push('Material takeoff item without a key.');if(!(i.quantity>0))errors.push(`Material ${i.key} has non-positive quantity.`);if(!(i.grossQuantity>=i.quantity))errors.push(`Material ${i.key} gross quantity is below net quantity.`);}for(const a of p.assembliesTakeoff||[]){const area=a.areaM2??a.netAreaM2;if(!(area>0))warnings.push(`Assembly ${a.id} has no positive area.`);}return {valid:errors.length===0,errors,warnings};}
export function phase26Manifest(building){normalizePhase26(building);return {schema:PHASE26_SCHEMA,project:{id:building.id,name:building.name},summary:clone(building.phase26.summary),materials:clone(building.phase26.items),assemblies:clone(building.phase26.assembliesTakeoff),elements:clone(building.phase26.elementTakeoff),openings:clone(building.phase26.openings),notes:['Phase 26 quantities are model-derived design estimates.','Waste allowances are configurable assumptions and should be reviewed against project specifications and procurement practice.','Quantities and materials do not constitute certified construction estimates.']};}
export { materialCatalog as PHASE26_MATERIAL_CATALOG, assemblies as PHASE26_ASSEMBLIES };
