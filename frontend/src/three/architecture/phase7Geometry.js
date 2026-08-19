// Phase 7 Three.js production geometry: guardrails/handrails and roof ridge/eave
// references. Geometry is generated from the canonical Building IR.
import * as THREE from 'three';
import { stairProductionCheck } from './phase7Systems.js';

function beamBetween(a,b,radius=0.025,material){
  const a3=new THREE.Vector3(...a), b3=new THREE.Vector3(...b), mid=a3.clone().add(b3).multiplyScalar(0.5);
  const len=a3.distanceTo(b3), mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,8),material);
  mesh.position.copy(mid); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b3.clone().sub(a3).normalize());
  mesh.castShadow=true; mesh.receiveShadow=true; return mesh;
}

export function buildStairGuardrailGroup(stair,from,to,material){
  const group=new THREE.Group(); group.name=`guardrail_${stair.id}`; group.userData.group='structure'; group.userData.floor=stair.fromFloor;
  const calc=stairProductionCheck(stair,from,to), width=stair.width||1.1, run=calc.run, railH=0.9;
  const mat=material||new THREE.MeshStandardMaterial({color:0x666a6e,metalness:0.55,roughness:0.35});
  const z0=stair.position?.[1]||0, x0=stair.position?.[0]||0;
  const p1=[x0-width/2,z0]; const p2=[x0-width/2,z0-run];
  const y1=from.elevation+calc.riserHeight, y2=from.elevation+calc.riserHeight*calc.risers+railH;
  group.add(beamBetween([p1[0],y1,p1[1]],[p2[0],y2,p2[1]],0.028,mat));
  const count=Math.max(2,Math.floor(run/0.6));
  for(let i=0;i<=count;i++){const t=i/count;const x=p1[0],z=p1[1]+(p2[1]-p1[1])*t,y=from.elevation+calc.riserHeight*(1+(calc.risers-1)*t);group.add(beamBetween([x,y,z],[x,y+railH,z],0.018,mat));}
  return group;
}

export function buildPhase7ProductionGroup(building){
  const root=new THREE.Group(); root.name='phase7-production'; root.userData.group='structure';
  for(const stair of building.stairs||[]){const from=building.levels.find(l=>l.index===stair.fromFloor),to=building.levels.find(l=>l.index===stair.toFloor);if(from&&to) root.add(buildStairGuardrailGroup(stair,from,to));}
  return root;
}
