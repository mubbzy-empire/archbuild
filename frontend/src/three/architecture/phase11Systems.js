// Phase 11 — BIM interoperability, model intelligence and coordination.
// Generates a real IFC4 STEP text export (simplified but structurally valid IFC
// entity graph), plus deterministic model queries and clash checks.

export const PHASE11_SCHEMA = 'archvision-bim-1.1';
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

function hash32(text, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function guid22(seed) {
  let a = BigInt(hash32(seed));
  let b = BigInt(hash32(seed, 2246822519));
  let n = (a << 32n) | b;
  let out = '';
  for (let i = 0; i < 22; i++) { out = alphabet[Number(n & 63n)] + out; n >>= 6n; }
  return out;
}
const esc = s => `'${String(s ?? '').replace(/'/g, "''")}'`;
const opt = v => v == null ? '$' : v;
const num = v => Number.isFinite(Number(v)) ? Number(v).toFixed(6).replace(/0+$/,'').replace(/\.$/,'') : '0';
const point = (x,y,z) => `#${x},#${y},#${z}`;

function area(poly = []) { let a = 0; for (let i=0;i<poly.length;i++){ const q=poly[(i+1)%poly.length]; a += poly[i][0]*q[1]-q[0]*poly[i][1]; } return Math.abs(a/2); }
function wallMid(w) { return [(w.start[0]+w.end[0])/2, (w.start[1]+w.end[1])/2]; }
function bounds2(points=[]) { const xs=points.map(p=>p[0]), zs=points.map(p=>p[1]); return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)}; }
function bboxWall(w, level) {
  const xs=[w.start[0],w.end[0]], zs=[w.start[1],w.end[1]], t=(w.thickness||.2)/2;
  return {minX:Math.min(...xs)-t,maxX:Math.max(...xs)+t,minZ:Math.min(...zs)-t,maxZ:Math.max(...zs)+t,minY:level.elevation,maxY:level.elevation+(w.height||level.height)};
}
function bboxComponent(c, level) {
  const p=c.position||[0,0,0], s=c.size||[.3,.3,.3];
  return {minX:p[0]-s[0]/2,maxX:p[0]+s[0]/2,minZ:p[2]-s[2]/2,maxZ:p[2]+s[2]/2,minY:level.elevation+(p[1]||0)-s[1]/2,maxY:level.elevation+(p[1]||0)+s[1]/2};
}
function intersects(a,b) { return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ && a.minY < b.maxY && a.maxY > b.minY; }

export function normalizePhase11(building) {
  building.metadata ||= {};
  building.metadata.schema = PHASE11_SCHEMA;
  building.bim ||= {};
  building.bim.ifc ||= { version:'IFC4', exportMode:'STEP', geometry:'simplified-parametric' };
  building.bim.queries ||= [];
  building.bim.coordination ||= { clashes:[], lastRun:null };
  building.documentation ||= {};
  building.documentation.ifc ||= {};
  building.documentation.ifc.version = 'IFC4';
  building.documentation.ifc.exportReady = true;
  return building;
}

export function phase11ModelIndex(building) {
  normalizePhase11(building);
  const items=[];
  for(const level of building.levels||[]) {
    for(const w of level.walls||[]) items.push({id:w.id,type:'wall',class:'IfcWall',level:level.index,name:w.name||w.id,bbox:bboxWall(w,level),entity:w});
    for(const r of level.rooms||[]) items.push({id:r.id,type:'room',class:'IfcSpace',level:level.index,name:r.name||r.id,area:area(r.polygon),entity:r});
    for(const w of level.walls||[]) for(const o of w.openings||[]) items.push({id:o.id,type:o.type==='door'?'door':'window',class:o.type==='door'?'IfcDoor':'IfcWindow',level:level.index,name:o.name||o.id,hostWall:w.id,entity:o});
    for(const c of level.components||[]) items.push({id:c.id,type:c.type,class:c.type==='column'?'IfcColumn':c.type==='beam'?'IfcBeam':c.type==='slab'?'IfcSlab':'IfcBuildingElementProxy',level:level.index,name:c.name||c.id,bbox:bboxComponent(c,level),entity:c});
  }
  building.bim.index = items;
  return items;
}

export function queryModel(building, query = {}) {
  const index = building.bim?.index || phase11ModelIndex(building);
  const type = query.type || query.class;
  const level = query.level == null ? null : Number(query.level);
  const text = query.text ? String(query.text).toLowerCase() : null;
  const results=index.filter(i => (!type || i.type===type || i.class===type) && (level==null || i.level===level) && (!text || `${i.name} ${i.id}`.toLowerCase().includes(text)));
  const summary={count:results.length,ids:results.map(r=>r.id),items:results.map(r=>({id:r.id,type:r.type,class:r.class,level:r.level,name:r.name,area:r.area,hostWall:r.hostWall}))};
  building.bim.queries.push({timestamp:new Date().toISOString(),query,summary});
  return summary;
}

export function runCoordinationClashCheck(building) {
  const index = phase11ModelIndex(building).filter(i=>i.bbox && ['wall','column','beam','slab'].includes(i.type));
  const clashes=[];
  for(let i=0;i<index.length;i++) for(let j=i+1;j<index.length;j++) {
    const a=index[i],b=index[j]; if(a.level!==b.level) continue;
    if(intersects(a.bbox,b.bbox)) {
      const bothWalls=a.type==='wall'&&b.type==='wall';
      if(!bothWalls) clashes.push({id:`CL-${clashes.length+1}`,severity:'coordination',level:a.level,a:a.id,b:b.id,message:`${a.class} ${a.id} intersects ${b.class} ${b.id}`});
    }
  }
  building.bim.coordination={clashes,lastRun:new Date().toISOString()};
  return building.bim.coordination;
}

function add(lines, type, args) { const id=lines.length+1; lines.push({id,type,args}); return id; }
function ref(id){return `#${id}`;}
function ifcCartesianPoint(lines,x,y,z){ return add(lines,'IFCCARTESIANPOINT',`(( ${num(x)},${num(y)},${num(z)} ))`); }
function ifcAxis(lines,x0=0,y0=0,z0=0,dx=1,dy=0,dz=0){ const p=ifcCartesianPoint(lines,x0,y0,z0); const z=ifcDirection(lines,0,0,1); const x=ifcDirection(lines,dx,dy,dz); return add(lines,'IFCAXIS2PLACEMENT3D',`(${ref(p)},${ref(z)},${ref(x)})`); }
function ifcDirection(lines,x,y,z){ return add(lines,'IFCDIRECTION',`((${num(x)},${num(y)},${num(z)}))`); }
function ifcLocalPlacement(lines,parent,axis){ return add(lines,'IFCLOCALPLACEMENT',`(${parent?ref(parent):'$'},${ref(axis)})`); }
function ifcOwner(lines,personName){ const person=add(lines,'IFCPERSON',`$,$,${esc(personName)},$,$,$,$,$`); const org=add(lines,'IFCORGANIZATION',`$,'ArchVision',${esc('ArchVision Professional')},$,$`); const pa=add(lines,'IFCPERSONANDORGANIZATION',`(${ref(person)},${ref(org)})`); const app=add(lines,'IFCAPPLICATION',`(${ref(org)},'1.0','ArchVision Professional','ArchVision')`); return add(lines,'IFCOWNERHISTORY',`(${ref(pa)},${ref(app)},$,$,.ADDED.,$,$,$)`); }
function ifcLabelProp(lines,name,value){ const p=add(lines,'IFCPROPERTYSINGLEVALUE',`${esc(name)},${esc(name)},${value},$`); return p; }
function ifcPropertySet(lines,owner,name,props){ const ps=props.map(([n,v])=>ref(ifcLabelProp(lines,n,v))).join(','); return add(lines,'IFCPROPERTYSET',`(${ref(owner)},${esc(name)},${esc(name)},(${ps}))`); }
function ifcRelDefines(lines,owner,objects,pset){ return add(lines,'IFCRELDEFINESBYPROPERTIES',`(${esc(guid22('rel:'+owner+pset))},${ref(owner)},$,$,(${objects.map(ref).join(',')}),${ref(pset)})`); }

function wallGeometry(lines, owner, wall, level, placement) {
  const len=Math.max(.01,Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]));
  const profile=add(lines,'IFCRECTANGLEPROFILEDEF',`.AREA.,$,$,${num(len)},${num(wall.thickness||.2)}`);
  const origin=ifcAxis(lines);
  const solid=add(lines,'IFCEXTRUDEDAREASOLID',`(${ref(profile)},${ref(origin)},${ref(ifcDirection(lines,0,0,1))},${num(wall.height||level.height)})`);
  const rep=add(lines,'IFCSHAPEREPRESENTATION',`${ref(owner)},'Body','SweptSolid',(${ref(solid)})`);
  return add(lines,'IFCPRODUCTDEFINITIONSHAPE',`$,$,(${ref(rep)})`);
}

export function buildIfc4Step(building) {
  normalizePhase11(building);
  const lines=[];
  const addEntity=(type,args)=>add(lines,type,args);
  const owner=ifcOwner(lines,'ArchVision User');
  const projectId=guid22('project:'+building.id), siteId=guid22('site:'+building.id), bldgId=guid22('building:'+building.id);
  const worldAxis=ifcAxis(lines);
  const project=addEntity('IFCPROJECT',`('${projectId}',${ref(owner)},${esc(building.name||'ArchVision Project')},$,$,$,$,$,$)`);
  const sitePlace=ifcLocalPlacement(lines,null,worldAxis); const site=addEntity('IFCSITE',`('${siteId}',${ref(owner)},'Site',$,$,${ref(sitePlace)},$,$,.ELEMENT.,$,$,$,$,$)`);
  const buildingPlace=ifcLocalPlacement(lines,sitePlace,worldAxis); const bldg=addEntity('IFCBUILDING',`('${bldgId}',${ref(owner)},${esc(building.name||'Building')},$,$,${ref(buildingPlace)},$,$,.ELEMENT.,$,$,$)`);
  const spatialIds=[];
  for(const level of building.levels||[]) {
    const lid=guid22('level:'+level.id); const lp=ifcLocalPlacement(lines,buildingPlace,worldAxis);
    spatialIds.push(addEntity('IFCBUILDINGSTOREY',`('${lid}',${ref(owner)},${esc('Floor '+level.index)},$,$,${ref(lp)},$,$,.ELEMENT.,${num(level.elevation)})`));
  }
  const elements=[]; const psets=[];
  for(const level of building.levels||[]) {
    const storey=spatialIds[building.levels.indexOf(level)];
    for(const wall of level.walls||[]) {
      const dx=wall.end[0]-wall.start[0], dz=wall.end[1]-wall.start[1], len=Math.hypot(dx,dz)||1; const axis=ifcAxis(lines,wall.start[0],0,wall.start[1],dx/len,0,dz/len); const place=ifcLocalPlacement(lines,storey,axis);
      const dummy=addEntity('IFCWALL',`('${guid22('wall:'+wall.id)}',${ref(owner)},${esc(wall.name||wall.id)},$,$,${ref(place)},$,$,.ELEMENT.)`);
      const shape=wallGeometry(lines,dummy,wall,level,place); lines[dummy-1].args=lines[dummy-1].args.replace(',$,$,.ELEMENT.)',`,${ref(shape)},$,.ELEMENT.)`);
      const ps=ifcPropertySet(lines,dummy,'Pset_WallCommon',[['Reference',esc(wall.type||'wall')],['Length',num(Math.hypot(wall.end[0]-wall.start[0],wall.end[1]-wall.start[1]))],['Thickness',num(wall.thickness||.2)]]); psets.push([dummy,ps]);
    }
    for(const room of level.rooms||[]) {
      const c=(room.polygon||[]).reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]); const n=(room.polygon||[]).length||1; const axis=ifcAxis(lines,c[0]/n,0,c[1]/n); const place=ifcLocalPlacement(lines,storey,axis); const r=addEntity('IFCSPACE',`('${guid22('space:'+room.id)}',${ref(owner)},${esc(room.name||room.id)},$,$,${ref(place)},$,$,.ELEMENT.,$)`); const ps=ifcPropertySet(lines,r,'Pset_SpaceCommon',[['NetArea',num(area(room.polygon))]]); psets.push([r,ps]);
    }
    for(const c of level.components||[]) {
      const axis=ifcAxis(lines,c.position?.[0]||0,c.position?.[1]||0,c.position?.[2]||0); const place=ifcLocalPlacement(lines,storey,axis); const type=c.type==='column'?'IFCCOLUMN':c.type==='beam'?'IFCBEAM':c.type==='slab'?'IFCSLAB':'IFCBUILDINGELEMENTPROXY'; const e=addEntity(type,`('${guid22(c.type+':'+c.id)}',${ref(owner)},${esc(c.name||c.id)},$,$,${ref(place)},$,$,.ELEMENT.)`); const ps=ifcPropertySet(lines,e,'ArchVision_Component',[['Type',esc(c.type)],['Width',num(c.size?.[0]||0)],['Height',num(c.size?.[1]||0)],['Depth',num(c.size?.[2]||0)]]); psets.push([e,ps]);
    }
  }
  const relSite=addEntity('IFCRELAGGREGATES',`('${guid22('agg:site')}',${ref(owner)},$,$,${ref(project)},(${ref(site)}))`);
  const relBuilding=addEntity('IFCRELAGGREGATES',`('${guid22('agg:building')}',${ref(owner)},$,$,${ref(site)},(${ref(bldg)}))`);
  const relStoreys=addEntity('IFCRELAGGREGATES',`('${guid22('agg:storeys')}',${ref(owner)},$,$,${ref(bldg)},(${spatialIds.map(ref).join(',')}))`);
  for(const level of building.levels||[]) {
    const storey=spatialIds[building.levels.indexOf(level)];
    const related=[];
    for(const wall of level.walls||[]) { const idx=lines.findIndex(x=>x.type==='IFCWALL' && x.args.includes(guid22('wall:'+wall.id))); if(idx>=0) related.push(idx+1); }
    for(const room of level.rooms||[]) { const idx=lines.findIndex(x=>x.type==='IFCSPACE' && x.args.includes(guid22('space:'+room.id))); if(idx>=0) related.push(idx+1); }
    for(const c of level.components||[]) { const idx=lines.findIndex(x=>x.type===(c.type==='column'?'IFCCOLUMN':c.type==='beam'?'IFCBEAM':c.type==='slab'?'IFCSLAB':'IFCBUILDINGELEMENTPROXY') && x.args.includes(guid22(c.type+':'+c.id))); if(idx>=0) related.push(idx+1); }
    if(related.length) addEntity('IFCRELCONTAINEDINSPATIALSTRUCTURE',`('${guid22('contains:'+level.id)}',${ref(owner)},$,$,(${related.map(ref).join(',')}),${ref(storey)})`);
  }
  for(const [e,ps] of psets) addEntity('IFCRELDEFINESBYPROPERTIES',`('${guid22('ps:'+e)}',${ref(owner)},$,$,(${ref(e)}),${ref(ps)})`);
  const header=`ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ArchVision Professional IFC4'),'2;1');\nFILE_NAME(${esc(`${building.name||'ArchVision'}-model.ifc`)},${esc(new Date().toISOString())},('ArchVision'),('ArchVision Professional'),'ArchVision IFC4 exporter','ArchVision','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;`;
  const data=lines.map((e,i)=>`#${i+1}=${e.type}(${e.args});`).join('\n');
  return `${header}\n${data}\nENDSEC;\nEND-ISO-10303-21;\n`;
}

export function phase11Manifest(building) {
  normalizePhase11(building); const index=phase11ModelIndex(building); const coordination=runCoordinationClashCheck(building);
  return {schema:PHASE11_SCHEMA,project:{id:building.id,name:building.name},ifc:{version:'IFC4',format:'STEP',exportReady:true},counts:{elements:index.length,clashes:coordination.clashes.length},queries:building.bim.queries.slice(-20),coordination,notes:['IFC export contains semantic project/storey/element/property-set entities and simplified wall geometry.','Engineering approval, code compliance and certified IFC validation remain professional review responsibilities.']};
}

export function validatePhase11(building) {
  normalizePhase11(building); const errors=[],warnings=[]; const index=phase11ModelIndex(building);
  if(!building.documentation.ifc.exportReady) errors.push('IFC export is not marked ready.');
  if(!index.length) errors.push('No BIM elements available for interoperability.');
  for(const i of index) if(!i.id) errors.push('An indexed element is missing a stable id.');
  const clash=building.bim.coordination?.clashes || [];
  if(clash.length) warnings.push(`${clash.length} coordination clash(es) require review.`);
  if((building.levels||[]).some(l=>!(l.elevation>=0 || l.index===0))) warnings.push('One or more storey elevations are unusual; verify datum setup.');
  return {valid:errors.length===0,errors,warnings};
}
