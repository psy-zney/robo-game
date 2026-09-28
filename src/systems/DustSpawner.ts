import * as THREE from 'three';
import { CELL_SIZE, getLevelTuning, GRID_SIZE } from '../utils/constants';

interface DustParticle {
  mesh: THREE.Mesh;
  active: boolean;
  lifetime: number;
  anchor: THREE.Vector3;
}

export class DustSpawner {
  private dustGroup = new THREE.Group();
  private particles: DustParticle[] = [];
  private scene: THREE.Scene;
  private floorY = 0;
  private spawnBounds?: THREE.Box3;
  private particleGeometry = new THREE.SphereGeometry(0.018, 8, 8);
  private spawnPoints?: THREE.Vector3[];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scene.add(this.dustGroup);
  }

  public spawnForDay(dayNumber: number, floorY: number, color: number = 0xcccccc, bounds?: THREE.Box3, points?: THREE.Vector3[]) {
    this.clearAll();

    this.floorY = floorY;
    this.spawnBounds = bounds?.clone();
    this.spawnPoints = points;

    const numDust = points?.length === 0 ? 0 : getLevelTuning(dayNumber).dustParticles;
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
        lifetime: 0,
        anchor: mesh.position.clone(),
      });
    }
  }

  public update(deltaTime: number) {
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.lifetime += deltaTime;
      particle.mesh.position.y = particle.anchor.y + Math.sin(particle.lifetime * 2.2) * 0.006;
    }
  }

  public checkCollision(playerPosition: THREE.Vector3, sweepActive: boolean, capacity = Infinity, canCollect?: (point: THREE.Vector3) => boolean): number {
    if (!sweepActive) return 0;

    let cleaned = 0;
    const sweepRadius = 0.52;

    for (const particle of this.particles) {
      if (!particle.active) continue;
      if (cleaned >= capacity) break;

      const dist = particle.mesh.position.distanceTo(playerPosition);
      if (dist < sweepRadius && (!canCollect || canCollect(particle.mesh.position))) {
        particle.active = false;
        particle.mesh.visible = false;
        cleaned += 1;
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

  private placeParticle(mesh: THREE.Mesh) {
    const area = this.getSpawnArea();
    const point = this.spawnPoints?.[Math.floor(Math.random() * this.spawnPoints.length)];
    const x = point?.x ?? THREE.MathUtils.lerp(area.minX, area.maxX, Math.random());
    const z = point?.z ?? THREE.MathUtils.lerp(area.minZ, area.maxZ, Math.random());
    const y = (point?.y ?? this.floorY) + 0.025 + Math.random() * 0.04;
    mesh.position.set(x, y, z);
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

}
