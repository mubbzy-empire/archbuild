// Phase 8 Three.js geometry: architectural opening detail and roof edge references.
import * as THREE from 'three';
import { openingWorldTransform } from './openingSystem.js';
import { frameMaterial } from './materialSystem.js';

function beam(a,b,r=.025,mat){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av),m=av.clone().add(bv).multiplyScalar(.5);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length,8),mat); mesh.position.copy(m); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()); return mesh;
}

export function buildOpeningDetailGroup(building){
  const root=new THREE.Group(); root.name='phase8-opening-detail'; root.userData.group='opening-detail';
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const opening of wall.openings||[]){
    const g=new THREE.Group(); g.name=`detail_${opening.id}`; g.userData.group=opening.type==='window'?'window':'door'; g.userData.openingId=opening.id;
    const t=openingWorldTransform(wall,opening); g.position.set(...t.position); g.rotation.y=t.rotY;
    if((opening.type||'').includes('door')){
      const hand=opening.swing==='left'?-1:1, r=opening.width||.9, pts=[];
      const n=16; for(let i=0;i<=n;i++){const a=(Math.PI/2)*(i/n);pts.push(new THREE.Vector3(hand*r*Math.cos(a),.02,hand*r*Math.sin(a)));}
      const curve=new THREE.LineCurve3(pts[0],pts[n]); const geo=new THREE.BufferGeometry().setFromPoints(pts); const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xc69a55})); line.userData.group='door'; g.add(line);
      g.add(beam([0,.02,0],[hand*r,.02,0],.012,frameMaterial('aluminium')));
    }
    root.add(g);
  }
  return root;
}

export function buildRoofEdgeReferenceGroup(building){
  const root=new THREE.Group(); root.name='phase8-roof-edges'; root.userData.group='roof';
  const top=building.levels?.[building.levels.length-1]; if(!top?.footprint?.length) return root;
  const pts=top.footprint, mat=new THREE.LineBasicMaterial({color:0x8b7352});
  const y=top.elevation+top.height+.02;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0],y,a[1]),new THREE.Vector3(b[0],y,b[1])]);root.add(new THREE.Line(geo,mat));}
  return root;
}

export function buildPhase8ProductionGroup(building){
  const root=new THREE.Group(); root.name='phase8-production'; root.userData.group='structure'; root.add(buildOpeningDetailGroup(building)); root.add(buildRoofEdgeReferenceGroup(building)); return root;
}
