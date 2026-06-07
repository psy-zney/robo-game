import * as THREE from 'three';
import { CELL_SIZE, getLevelTuning, GRID_SIZE } from '../utils/constants';

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
  private floorY = 0;
  private spawnBounds?: THREE.Box3;
  private particleGeometry = new THREE.SphereGeometry(0.018, 8, 8);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.dustGroup);
  }

  public spawnForDay(dayNumber: number, floorY: number, color: number = 0xcccccc, bounds?: THREE.Box3) {
    this.clearAll();

    this.floorY = floorY;
    this.spawnBounds = bounds?.clone();

    const numDust = getLevelTuning(dayNumber).dustParticles;
    for (let i = 0; i < numDust; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 0.78,
      });
      const mesh = new THREE.Mesh(this.particleGeometry, material);
      this.placeParticle(mesh);

      const scale = 0.72 + Math.random() * 0.58;
      mesh.scale.setScalar(scale);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      this.dustGroup.add(mesh);
      this.particles.push({
        mesh,
        active: true,
        velocity: this.createVelocity(),
        lifetime: 0,
        maxLifetime: 10 + Math.random() * 20,
      });
    }
  }

  public update(deltaTime: number) {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
      particle.mesh.position.y += Math.sin(particle.lifetime * 2.2) * 0.0012 * deltaTime;
      particle.lifetime += deltaTime;

      if (!this.isInsideBounds(particle.mesh.position) || particle.lifetime >= particle.maxLifetime) {
        this.respawnParticle(particle);
      }
    }
  }

  public checkCollision(playerPosition: THREE.Vector3, sweepActive: boolean): boolean {
    if (!sweepActive) return false;

    let cleaned = false;
    const sweepRadius = 0.52;

    for (const particle of this.particles) {
      if (!particle.active) continue;

      const dist = particle.mesh.position.distanceTo(playerPosition);
      if (dist < sweepRadius) {
        particle.active = false;
        particle.mesh.visible = false;
        cleaned = true;

        window.setTimeout(() => {
          this.respawnParticle(particle);
        }, 3000 + Math.random() * 2000);
      }
    }

    return cleaned;
  }

  public getActiveCount(): number {
    return this.particles.filter((particle) => particle.active).length;
  }

  public getTotalCount(): number {
    return this.particles.length;
  }

  public clearAll() {
    for (const particle of this.particles) {
      const material = particle.mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
      this.dustGroup.remove(particle.mesh);
    }
    this.particles = [];
  }

  private respawnParticle(particle: DustParticle) {
    this.placeParticle(particle.mesh);
    particle.velocity.copy(this.createVelocity());
    particle.lifetime = 0;
    particle.maxLifetime = 10 + Math.random() * 20;
    particle.active = true;
    particle.mesh.visible = true;
  }

  private placeParticle(mesh: THREE.Mesh) {
    const area = this.getSpawnArea();
    const x = THREE.MathUtils.lerp(area.minX, area.maxX, Math.random());
    const z = THREE.MathUtils.lerp(area.minZ, area.maxZ, Math.random());
    const y = this.floorY + 0.025 + Math.random() * 0.08;
    mesh.position.set(x, y, z);
  }

  private createVelocity() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 0.012,
      Math.random() * 0.018,
      (Math.random() - 0.5) * 0.012
    );
  }

  private getSpawnArea() {
    if (this.spawnBounds && !this.spawnBounds.isEmpty()) {
      return {
        minX: this.spawnBounds.min.x,
        maxX: this.spawnBounds.max.x,
        minZ: this.spawnBounds.min.z,
        maxZ: this.spawnBounds.max.z,
      };
    }

    const halfSize = (GRID_SIZE * CELL_SIZE) / 2 - 1.0;
    return { minX: -halfSize, maxX: halfSize, minZ: -halfSize, maxZ: halfSize };
  }

  private isInsideBounds(position: THREE.Vector3) {
    const area = this.getSpawnArea();
    return (
      position.x >= area.minX &&
      position.x <= area.maxX &&
      position.z >= area.minZ &&
      position.z <= area.maxZ &&
      position.y >= this.floorY &&
      position.y <= this.floorY + 0.28
    );
  }
}
