// Phase 22 — visible room/space topology aids for the professional 3D view.
import * as THREE from 'three';
export function buildPhase22SpaceTopologyGroup(building){
  const root=new THREE.Group();root.name='phase22_space_topology';root.userData.group='phase22';
  const mat=new THREE.LineBasicMaterial({color:0x5b8def,transparent:true,opacity:.75});
  for(const level of building.levels||[]) for(const room of level.rooms||[]){
    if(!room.polygon?.length)continue;const pts=room.polygon.map(p=>new THREE.Vector3(p[0],level.elevation+.035,p[1]));pts.push(pts[0]);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mat);line.userData={group:'phase22',roomId:room.id,floor:level.index,spaceBoundary:true};root.add(line);
  }
  return root;
}
