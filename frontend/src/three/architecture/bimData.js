// Stable BIM-oriented metadata and material assemblies.
// This is intentionally an interoperability layer, not an IFC writer yet.

function stableGlobalId(prefix, id) {
  const raw = `${prefix}:${id}`;
  let h1 = 2166136261, h2 = 16777619;
  for (let i=0;i<raw.length;i++) { h1 ^= raw.charCodeAt(i); h1 = Math.imul(h1, 16777619); h2 ^= raw.charCodeAt(i) * 31; h2 = Math.imul(h2, 2246822519); }
  const a = (h1 >>> 0).toString(16).padStart(8,'0');
  const b = (h2 >>> 0).toString(16).padStart(8,'0');
  return `${a}-${b}-${prefix}`.slice(0,22);
}

const ASSEMBLIES = {
  'external-wall-standard': { name:'External wall — standard', layers:[{material:'painted plaster',thickness:0.015},{material:'blockwork',thickness:0.15},{material:'internal plaster',thickness:0.015}], fireRating:'design-intent', thermal:'moderate' },
  'internal-wall-standard': { name:'Internal partition — standard', layers:[{material:'plaster',thickness:0.015},{material:'blockwork',thickness:0.10},{material:'plaster',thickness:0.015}], fireRating:'design-intent' },
  'floor-rc-tile': { name:'RC floor + tile finish', layers:[{material:'tile',thickness:0.012},{material:'screed',thickness:0.04},{material:'reinforced concrete',thickness:0.15}] },
  'roof-metal': { name:'Pitched roof — metal finish', layers:[{material:'metal roofing',thickness:0.01},{material:'membrane',thickness:0.005},{material:'insulation',thickness:0.08},{material:'roof deck',thickness:0.018}] },
  'flat-roof-rc': { name:'Flat roof — RC deck', layers:[{material:'waterproofing',thickness:0.006},{material:'screed to falls',thickness:0.05},{material:'reinforced concrete',thickness:0.15}] },
};

export function normalizeBimIdentity(building) {
  building.bim ||= { schema:'ArchVision-BIM-0.5', projectGuid:stableGlobalId('project',building.id), authoring:'ArchVision Professional' };
  building.bim.schema ||= 'ArchVision-BIM-0.5';
  building.bim.projectGuid ||= stableGlobalId('project',building.id);
  for(const level of building.levels||[]) {
    level.bim ||= { globalId:stableGlobalId('level',level.id||`floor-${level.index}`), class:'IfcBuildingStorey' };
    for(const room of level.rooms||[]) room.bim ||= { globalId:stableGlobalId('space',room.id), class:'IfcSpace' };
    for(const wall of level.walls||[]) {
      wall.bim ||= { globalId:stableGlobalId('wall',wall.id), class:'IfcWall' };
      for(const o of wall.openings||[]) o.bim ||= { globalId:stableGlobalId('opening',o.id), class:o.type.includes('door')?'IfcDoor':'IfcWindow' };
    }
    for(const c of level.components||[]) {
      c.bim ||= { globalId:stableGlobalId(c.type||'component',c.id), class:c.type==='column'?'IfcColumn':c.type==='beam'?'IfcBeam':c.type==='slab'?'IfcSlab':'IfcBuildingElementProxy' };
    }
  }
  if(building.roof) building.roof.bim ||= { globalId:stableGlobalId('roof',building.id), class:'IfcRoof' };
  return building;
}

export function materialAssemblies(building) {
  const assemblies = new Map();
  const add = (key, quantity, unit) => {
    if(!assemblies.has(key)) assemblies.set(key,{ key, ...ASSEMBLIES[key], quantity:0, unit });
    assemblies.get(key).quantity += quantity;
  };
  for(const level of building.levels||[]) for(const wall of level.walls||[]) add(wall.type==='interior'?'internal-wall-standard':'external-wall-standard', wall.length || 0, 'm');
  for(const level of building.levels||[]) for(const room of level.rooms||[]) {
    let area=0; const p=room.polygon||[]; for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a[0]*b[1]-b[0]*a[1];} add('floor-rc-tile',Math.abs(area)/2,'m²');
  }
  add(building.roof?.type==='flat'||building.roof?.type==='parapet'?'flat-roof-rc':'roof-metal',1,'assembly');
  return [...assemblies.values()].map(a=>({...a,quantity:Number(a.quantity.toFixed(2))}));
}

export function bimManifest(building) {
  normalizeBimIdentity(building);
  return {
    schema:building.bim.schema,
    projectGuid:building.bim.projectGuid,
    project:building.name,
    levels:(building.levels||[]).map(l=>({globalId:l.bim.globalId,class:l.bim.class,index:l.index,elevation:l.elevation,height:l.height})),
    elements:(building.levels||[]).flatMap(l=>[
      ...(l.walls||[]).map(w=>({globalId:w.bim.globalId,class:w.bim.class,id:w.id,level:l.index})),
      ...(l.rooms||[]).map(r=>({globalId:r.bim.globalId,class:r.bim.class,id:r.id,level:l.index})),
      ...(l.components||[]).map(c=>({globalId:c.bim.globalId,class:c.bim.class,id:c.id,level:l.index})),
      ...(l.walls||[]).flatMap(w=>(w.openings||[]).map(o=>({globalId:o.bim.globalId,class:o.bim.class,id:o.id,hostWall:w.id,level:l.index}))),
    ]),
    materials:materialAssemblies(building).map(({key,name,layers,quantity,unit})=>({key,name,layers,quantity,unit})),
    note:'Interoperability manifest. Not a certified IFC exchange file.'
  };
}
