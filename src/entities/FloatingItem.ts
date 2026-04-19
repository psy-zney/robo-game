import * as THREE from 'three';
import { CELL_SIZE } from '../utils/constants';

export type FloatingItemType = 'SMALL' | 'DUST' | 'MEDIUM';

export interface FloatingItem {
  type: FloatingItemType;
  mesh: THREE.Mesh;
  scanTimer: number;
  baseY: number;
}

export function createFloatingItem(type: FloatingItemType, x: number, z: number): FloatingItem {
  let geometry: THREE.BufferGeometry;
  let material: THREE.MeshStandardMaterial;

  if (type === 'SMALL') {
    geometry = new THREE.SphereGeometry(CELL_SIZE * 0.18, 10, 10);
    material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.2 });
  } else if (type === 'DUST') {
    geometry = new THREE.SphereGeometry(CELL_SIZE * 0.22, 10, 10);
    material = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8, metalness: 0.05 });
  } else {
    geometry = new THREE.BoxGeometry(CELL_SIZE * 0.42, CELL_SIZE * 0.42, CELL_SIZE * 0.42);
    material = new THREE.MeshStandardMaterial({ color: 0xf7c74f, roughness: 0.5, metalness: 0.3 });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, CELL_SIZE * 0.3, z);
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  return {
    type,
    mesh,
    scanTimer: 0,
    baseY: mesh.position.y,
  };
}
