import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Bake static house transforms once and batch compatible meshes by material. */
export function createStaticBatch(source: THREE.Object3D): THREE.Group {
  source.updateMatrixWorld(true);
  const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const group = new THREE.Group();
  source.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    if (Array.isArray(mesh.material)) {
      const copy = new THREE.Mesh(geometry, mesh.material);
      copy.receiveShadow = true;
      group.add(copy);
      return;
    }
    const signature = Object.keys(geometry.attributes).sort().map(name => {
      const attribute = geometry.attributes[name];
      return `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`;
    }).join(',');
    const key = `${mesh.material.uuid}:${!!geometry.index}:${signature}`;
    const batch = batches.get(key) ?? { material: mesh.material, geometries: [] };
    batch.geometries.push(geometry);
    batches.set(key, batch);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.receiveShadow = true;
      group.add(mesh);
      for (const input of batch.geometries) input.dispose();
    } else {
      for (const input of batch.geometries) group.add(new THREE.Mesh(input, batch.material));
    }
  }
  return group;
}
