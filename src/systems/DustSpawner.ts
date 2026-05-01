import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE } from '../utils/constants';

interface DustParticle {
  mesh: THREE.Mesh;
  active: boolean;
}

export class DustSpawner {
  private dustGroup = new THREE.Group();
  private particles: DustParticle[] = [];

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.dustGroup);
  }

  public spawnForDay(dayNumber: number, floorY: number, color: number = 0xcccccc) {
    // Clear old dust
    for (const p of this.particles) {
      this.dustGroup.remove(p.mesh);
    }
    this.particles = [];

    const numDust = 20 + dayNumber * 5;
    const geometry = new THREE.SphereGeometry(0.02, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
    });

    const halfSize = (GRID_SIZE * CELL_SIZE) / 2 - 1.0;

    for (let i = 0; i < numDust; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      const x = (Math.random() - 0.5) * halfSize * 2;
      const z = (Math.random() - 0.5) * halfSize * 2;
      mesh.position.set(x, floorY + 0.02, z);
      
      this.dustGroup.add(mesh);
      this.particles.push({ mesh, active: true });
    }
  }

  public checkCollision(playerPosition: THREE.Vector3, sweepActive: boolean): boolean {
    if (!sweepActive) return false;

    let cleaned = false;
    const sweepRadius = 0.5; // Radius within which dust is sucked up

    for (const p of this.particles) {
      if (p.active) {
        const dist = p.mesh.position.distanceTo(playerPosition);
        if (dist < sweepRadius) {
          p.active = false;
          p.mesh.visible = false; // Hide it immediately
          cleaned = true;
        }
      }
    }
    return cleaned;
  }
}
