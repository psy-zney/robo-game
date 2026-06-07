import * as THREE from 'three';

/**
 * Obstacle - Static obstacle entity for collision detection
 * Chướng ngại vật - Thực thể chướng ngại vật tĩnh để phát hiện va chạm
 */
export class Obstacle {
  public mesh: THREE.Mesh;
  public bounds: THREE.Box3;

  /**
   * Create a new obstacle with specified dimensions and position
   * Tạo chướng ngại vật mới với kích thước và vị trí được chỉ định
   * @param width - Obstacle width in meters
   * @param height - Obstacle height in meters
   * @param depth - Obstacle depth in meters
   * @param x - X position in world coordinates
   * @param z - Z position in world coordinates
   * @param color - Obstacle color as hex number
   */
  constructor(width: number, height: number, depth: number, x: number, z: number, color: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, height / 2, z);
    this.bounds = new THREE.Box3().setFromObject(this.mesh);
  }
}
