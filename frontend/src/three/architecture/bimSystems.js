// Phase 5 BIM/CAD production systems.
// These are deterministic model-derived systems: the AI supplies design intent,
// while these functions turn that intent into repeatable architectural data and
// geometry. They intentionally avoid pretending to be structural-code analysis.
import * as THREE from 'three';
import { wallLength, wallMidpoint } from './buildingModel.js';
import { exteriorMaterial, interiorMaterial, roofMaterial } from './materialSystem.js';

const EPS = 0.06;
const key = p => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);

export function solveProfessionalWallJoins(level) {
  const walls = level?.walls || [];
  const ends = new Map();
  walls.forEach(w => [ ['start', w.start], ['end', w.end] ].forEach(([end,p]) => {
    const k = key(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push({ wall:w, end, point:p });
  }));
  walls.forEach(w => {
    w.joints ||= {};
    for (const [end,p] of [['start',w.start],['end',w.end]]) {
      const hits = [];
      for (const other of walls) {
        if (other.id === w.id) continue;
        const hit = dist(p, other.start) < EPS || dist(p, other.end) < EPS ||
          segmentDistance(p, other.start, other.end) < EPS;
        if (hit) hits.push(other.id);
      }
      const unique = [...new Set(hits)];
      const type = unique.length === 0 ? 'free' : unique.length === 1 ? 'corner-or-t' : 'multi-junction';
      w.joints[end] = { type, connectedWallIds: unique };
    }
  });
  return level;
}

function segmentDistance(p,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1]; const l2=dx*dx+dz*dz || 1;
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l2));
  return Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dz));
}

export function wallJoinReport(building) {
  const rows=[];
  for (const level of building.levels||[]) for (const w of level.walls||[]) {
    rows.push({ level:level.index, wall:w.id, start:w.joints?.start?.type||'unresolved', end:w.joints?.end?.type||'unresolved' });
  }
  return rows;
}

export function normalizeOpeningFamilies(building) {
  const defaults = {
    door:{family:'single-hinged', frame:'aluminium', leafCount:1, reveal:0.08},
    'sliding-door':{family:'sliding', frame:'aluminium', leafCount:2, reveal:0.08},
    'french-door':{family:'double-hinged', frame:'aluminium', leafCount:2, reveal:0.08},
    'garage-door':{family:'sectional', frame:'steel', leafCount:4, reveal:0.1},
    window:{family:'casement', frame:'aluminium', leafCount:1, reveal:0.08},
  };
  for (const level of building.levels||[]) for (const wall of level.walls||[]) for (const o of wall.openings||[]) {
    const d=defaults[o.type]||defaults.window;
    o.family ||= d.family; o.frameMaterial ||= d.frame; o.leafCount ||= d.leafCount; o.reveal ??= d.reveal;
    o.fireRating ||= o.type.includes('door') ? 'design-intent' : null;
    o.glazing ||= o.type === 'window' || o.type === 'sliding-door' || o.type === 'french-door' ? 'low-e double glazing' : null;
  }
  return building;
}

function box(g,size,pos,material,data={}) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  m.position.set(...pos); m.castShadow=true; m.receiveShadow=true; Object.assign(m.userData,{group:'structure',...data}); g.add(m); return m;
}

export function buildTiedFoundationGroup(building) {
  const g=new THREE.Group(); g.name='foundations'; g.userData.group='structure';
  const mat=exteriorMaterial('concrete','#8e8b83');
  for(const level of building.levels||[]) {
    if(level.index!==1) continue;
    for(const w of level.walls||[]) {
      if(!['exterior','compound','interior'].includes(w.type)) continue;
      const len=wallLength(w); if(len<0.1) continue;
      const m=wallMidpoint(w), r=Math.atan2(w.end[0]-w.start[0],w.end[1]-w.start[1]);
      box(g,[len,0.28,Math.max(0.45,w.thickness+0.25)],[m[0],-0.14,m[1]],mat,{structuralType:'strip-footing',hostWall:w.id,floor:1});
    }
    for(const c of level.components||[]) if(c.type==='column') {
      const p=c.position||[0,0,0]; box(g,[Math.max(.55,(c.size||[.3])[0]+.25),.25,Math.max(.55,(c.size||[.3])[2]+.25)],[p[0],-.125,p[2]],mat,{structuralType:'pad-footing',hostComponent:c.id,floor:1});
    }
  }
  return g;
}

function addLine(g,a,b,y,material,data={}) {
  const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0],y,a[1]),new THREE.Vector3(b[0],y,b[1])]);
  const line=new THREE.Line(geom,material); Object.assign(line.userData,{group:'ceiling',...data}); g.add(line); return line;
}

export function buildCeilingSystemGroup(building) {
  const g=new THREE.Group(); g.name='ceiling_systems'; g.userData.group='interior';
  const lineMat=new THREE.LineBasicMaterial({color:0x9aa0a6,transparent:true,opacity:.55});
  const edgeMat=new THREE.LineBasicMaterial({color:0x59616b,transparent:true,opacity:.75});
  for(const level of building.levels||[]) for(const room of level.rooms||[]) {
    const pts=room.polygon||[]; if(pts.length<3) continue;
    const y=level.elevation+(room.ceilingHeight||level.height)-.025;
    for(let i=0;i<pts.length;i++) addLine(g,pts[i],pts[(i+1)%pts.length],y,edgeMat,{room:room.name});
    const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]); const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    for(let x=minX+.3;x<maxX;x+=.6) addLine(g,[x,minZ],[x,maxZ],y,lineMat,{room:room.name,ceilingGrid:true});
    for(let z=minZ+.3;z<maxZ;z+=.6) addLine(g,[minX,z],[maxX,z],y,lineMat,{room:room.name,ceilingGrid:true});
  }
  return g;
}

export function roofPlaneSchedule(building) {
  const roof=building.roof||{}; const top=building.levels?.at(-1); if(!top) return [];
  return [{id:'RF-01',level:top.index,type:roof.type||'flat',pitchDeg:roof.pitchDeg||0,overhang:roof.overhang||0,material:roof.material||'metal',footprintPoints:(top.footprint||[]).length}];
}

export function buildSiteCoordinationGroup(building) {
  const g=new THREE.Group(); g.name='site_coordination'; g.userData.group='site';
  const boundary=building.site?.boundary||[]; if(boundary.length<3) return g;
  const lineMat=new THREE.LineBasicMaterial({color:0x4f83cc,transparent:true,opacity:.85});
  const pts=boundary.map(([x,z])=>new THREE.Vector3(x,.015,z)); pts.push(pts[0]);
  const boundaryLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat); boundaryLine.userData.group='site'; boundaryLine.userData.siteType='plot-boundary'; g.add(boundaryLine);
  const setback=building.site?.setbacks||{};
  const xs=boundary.map(p=>p[0]),zs=boundary.map(p=>p[1]); const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const sx=setback.left||0, rx=setback.right||0, fz=setback.front||0, rz=setback.rear||0;
  const inner=[[minX+sx,minZ+fz],[maxX-rx,minZ+fz],[maxX-rx,maxZ-rz],[minX+sx,maxZ-rz]];
  const sp=inner.map(([x,z])=>new THREE.Vector3(x,.02,z)); sp.push(sp[0]); const sl=new THREE.Line(new THREE.BufferGeometry().setFromPoints(sp),new THREE.LineBasicMaterial({color:0x76a85d,transparent:true,opacity:.7})); sl.userData.group='site'; sl.userData.siteType='setback-envelope'; g.add(sl);
  const roadWidth=building.site?.road?.width||5; const roadZ=building.site?.road?.z ?? (minZ-roadWidth/2);
  const road=new THREE.Mesh(new THREE.BoxGeometry(Math.max(1,maxX-minX),.04,roadWidth),new THREE.MeshStandardMaterial({color:0x6e7073,roughness:.95})); road.position.set((minX+maxX)/2,-.02,roadZ); road.userData.group='site'; road.userData.siteType='estate-road'; g.add(road);
  return g;
}

export function buildDisciplineRouteGroup(building) {
  const root=new THREE.Group(); root.name='discipline_routes'; root.userData.group='mep';
  const specs=[['electrical',0xf3c74f,.025],['plumbing',0x3d9be9,.035],['drainage',0x6d6f78,.04],['hvac',0x63c5c8,.035],['fire',0xe45d5d,.025]];
  for(const [name,color,radius] of specs){
    const routes=building.systems?.[name]?.routes||[];
    for(const r of routes){ const pts=r.points||[]; if(pts.length<2) continue; const y=r.elevation ?? 0.25; const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1]??y,p[2]))); const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(4,pts.length*4),radius,8,false),new THREE.MeshStandardMaterial({color,transparent:true,opacity:.85})); mesh.userData.group='mep'; mesh.userData.discipline=name; mesh.userData.routeId=r.id||`${name}-route`; root.add(mesh); }
  }
  return root;
}

export function phase5ModelReport(building) {
  const levels=building.levels||[];
  return {
    levels:levels.length,
    wallJoins:levels.reduce((n,l)=>n+(l.walls||[]).reduce((s,w)=>s+(w.joints?.start?.connectedWallIds?.length||0)+(w.joints?.end?.connectedWallIds?.length||0),0),0),
    openingFamilies:levels.reduce((n,l)=>n+(l.walls||[]).reduce((s,w)=>s+(w.openings||[]).filter(o=>o.family).length,0),0),
    foundations:levels[0] ? (levels[0].walls||[]).filter(w=>['exterior','interior','compound'].includes(w.type)).length : 0,
    roofPlanes:roofPlaneSchedule(building).length,
    ceilingRooms:levels.reduce((n,l)=>n+(l.rooms||[]).length,0),
    siteBoundaryPoints:(building.site?.boundary||[]).length,
    routedSystems:Object.keys(building.systems||{}).filter(k=>(building.systems?.[k]?.routes||[]).length),
  };
}
