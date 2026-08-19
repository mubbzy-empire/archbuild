import * as THREE from 'three';
import { exteriorMaterial, interiorMaterial } from './materialSystem.js';

function componentMaterial(component) {
  if (component.material === 'concrete') return exteriorMaterial('concrete', component.color || '#b9b6ad');
  if (component.material === 'metal' || component.material === 'aluminium') return exteriorMaterial('metal', component.color || '#66707a');
  if (component.material === 'wood') return exteriorMaterial('wood', component.color || '#9a6b3f');
  return interiorMaterial('plaster', component.color || '#d8d5cd');
}

export function buildComponentMesh(component, level = {}) {
  const group = new THREE.Group();
  group.name = component.name || component.type || 'Component';
  group.userData.componentId = component.id;
  group.userData.group = component.type || 'component';
  group.userData.floor = component.floor ?? level.index ?? 1;
  group.userData.discipline = component.discipline || 'architecture';

  const [x, y = 0, z] = component.position || [0, 0, 0];
  const size = component.size || [0.3, 3, 0.3];
  let mesh;
  if (component.type === 'column') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), componentMaterial(component));
  } else if (component.type === 'beam') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), componentMaterial(component));
  } else if (component.type === 'slab') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1] || 0.18, size[2]), componentMaterial(component));
  } else if (component.type === 'cylinder') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(size[0], size[0], size[1], 20), componentMaterial(component));
  } else if (component.type === 'opening') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], Math.max(size[2], 0.04)), new THREE.MeshStandardMaterial({ color: 0xbfe3ee, transparent: true, opacity: 0.25, roughness: 0.1 }));
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), componentMaterial(component));
  }
  mesh.position.set(x, y, z);
  mesh.rotation.y = component.rotation || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.componentId = component.id;
  mesh.userData.group = component.type || 'component';
  mesh.userData.floor = component.floor ?? level.index ?? 1;
  mesh.userData.discipline = component.discipline || 'architecture';
  group.add(mesh);
  return group;
}

export function buildLevelComponents(level) {
  const group = new THREE.Group();
  group.name = `components_floor_${level.index}`;
  (level.components || []).forEach(c => group.add(buildComponentMesh(c, level)));
  return group;
}
