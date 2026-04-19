import * as THREE from 'three';

export class Obstacle {
  public mesh: THREE.Mesh;
  public bounds: THREE.Box3;

  constructor(width: number, height: number, depth: number, x: number, z: number, color: number) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, height / 2, z);
    this.bounds = new THREE.Box3().setFromObject(this.mesh);
  }
}
