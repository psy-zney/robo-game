import * as THREE from 'three';
import { CELL_SIZE } from '../utils/constants';

/**
 * Floating item types for collectible objects
 * Các loại vật phẩm nổi để thu thập
 */
export type FloatingItemType = 'SMALL' | 'DUST' | 'MEDIUM';

/**
 * Floating item interface for collectible objects
 * Giao diện vật phẩm nổi để thu thập
 */
export interface FloatingItem {
  type: FloatingItemType;
  mesh: THREE.Mesh;
  scanTimer: number;
  baseY: number;
}

/**
 * Create a floating item at specified position
 * Tạo vật phẩm nổi tại vị trí được chỉ định
 * @param type - Type of floating item to create
 * @param x - X position in world coordinates
 * @param z - Z position in world coordinates
 * @returns Floating item object with mesh and properties
 */
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
