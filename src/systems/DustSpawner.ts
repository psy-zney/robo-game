import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE } from '../utils/constants';

interface DustParticle {
  mesh: THREE.Mesh;
  active: boolean;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
}

export class DustSpawner {
  private dustGroup = new THREE.Group();
  private particles: DustParticle[] = [];

  private scene: THREE.Scene;
  private particleGeometry: THREE.SphereGeometry;
  private particleMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.dustGroup);

    // Pre-create geometry and material for better performance
    this.particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    this.particleMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1,
    });
  }

  public spawnForDay(dayNumber: number, floorY: number, color: number = 0xcccccc) {
    console.log(`✨ Spawning dust particles for Day ${dayNumber}...`);

    // Clear old dust
    for (const p of this.particles) {
      this.dustGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.particles = [];

    // Increase dust count with day
    const numDust = 20 + dayNumber * 5;
    const halfSize = (GRID_SIZE * CELL_SIZE) / 2 - 1.0;

    // Update material color for the day
    this.particleMaterial.color.setHex(color);

    for (let i = 0; i < numDust; i++) {
      const mesh = new THREE.Mesh(this.particleGeometry, this.particleMaterial.clone());

      const x = (Math.random() - 0.5) * halfSize * 2;
      const z = (Math.random() - 0.5) * halfSize * 2;
      const y = floorY + 0.02 + Math.random() * 0.05; // Slight height variation

      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Random slight scale variation
      const scale = 0.8 + Math.random() * 0.4;
      mesh.scale.setScalar(scale);

      this.dustGroup.add(mesh);

      this.particles.push({
        mesh,
        active: true,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          Math.random() * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        lifetime: 0,
        maxLifetime: 10 + Math.random() * 20, // Random lifetime
      });
    }

    console.log(`✅ Spawned ${numDust} dust particles`);
  }

  public update(deltaTime: number) {
    // Update particle physics and lifetime
    for (const p of this.particles) {
      if (!p.active) continue;

      // Apply gentle floating motion
      p.mesh.position.addScaledVector(p.velocity, deltaTime);

      // Add slight bobbing motion
      p.mesh.position.y += Math.sin(p.lifetime * 2) * 0.001 * deltaTime;

      // Update lifetime
      p.lifetime += deltaTime;

      // Respawn if lifetime exceeded
      if (p.lifetime >= p.maxLifetime) {
        this.respawnParticle(p);
      }
    }
  }

  private respawnParticle(particle: DustParticle) {
    const halfSize = (GRID_SIZE * CELL_SIZE) / 2 - 1.0;

    particle.mesh.position.x = (Math.random() - 0.5) * halfSize * 2;
    particle.mesh.position.z = (Math.random() - 0.5) * halfSize * 2;
    particle.mesh.position.y = 0.02 + Math.random() * 0.05;

    particle.velocity.set(
      (Math.random() - 0.5) * 0.01,
      Math.random() * 0.02,
      (Math.random() - 0.5) * 0.01
    );

    particle.lifetime = 0;
    particle.maxLifetime = 10 + Math.random() * 20;
    particle.active = true;
    particle.mesh.visible = true;
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

          // Respawn after a delay for continuous gameplay
          setTimeout(() => {
            this.respawnParticle(p);
          }, 3000 + Math.random() * 2000);
        }
      }
    }
    return cleaned;
  }

  /** Get count of active particles */
  public getActiveCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  /** Get total particle count */
  public getTotalCount(): number {
    return this.particles.length;
  }

  /** Clear all particles */
  public clearAll() {
    for (const p of this.particles) {
      this.dustGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.particles = [];
  }
}
