import * as THREE from 'three';

function makeMarker(color=0xd7a35c){
  const g=new THREE.Group();
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.045,12,8),new THREE.MeshStandardMaterial({color,metalness:.15,roughness:.5}));
  g.add(m); return g;
}

export function buildPhase18ConstructionGroup(building){
  const root=new THREE.Group(); root.name='phase18_3d_authoring'; root.userData.group='phase18';
  root.userData.discipline='architecture';
  // Lightweight construction markers: the actual wall/opening/roof geometry is
  // already built by the canonical geometry engine. These markers give the
  // 3D editor stable, selectable reference points without duplicating solids.
  for(const level of building.levels||[]) for(const wall of level.walls||[]) {
    const center=[(wall.start[0]+wall.end[0])/2,wall.baseElevation+wall.height/2,(wall.start[1]+wall.end[1])/2];
    const marker=makeMarker(); marker.position.set(...center); marker.visible=false;
    marker.userData.wallId=wall.id; marker.userData.floor=level.index; marker.userData.authoringReference=true; root.add(marker);
  }
  return root;
}
