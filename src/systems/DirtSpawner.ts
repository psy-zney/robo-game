import * as THREE from 'three';
import { DIRT_INTERACT_DIST, DIRT_PLANE_SIZE, getLevelTuning } from '../utils/constants';

export type CleanMethod = 'sweep' | 'mop' | 'sweep_then_mop';
export const DIRT_LABELS: Record<string, string> = { Dust: 'Bụi khô', 'Thick Dust': 'Bụi dày', 'Coffee Spill': 'Cà phê', 'Sauce Stain': 'Sốt cà chua', 'Stubborn Dirt': 'Bùn bám', 'Heavy Grime': 'Vết bám dày' };

export interface DirtConfig {
  name: string;
  texture: string;
  method: CleanMethod;
  requiredActions: number;
  minDay: number;
  sizeRange: [number, number];
  tint: number;
  opacity: number;
}

export const DIRT_CONFIGS: DirtConfig[] = [
  {
    name: 'Dust',
    texture: '/image/dirt.png',
    method: 'sweep',
    requiredActions: 1,
    minDay: 1,
    sizeRange: [0.70, 0.95],
    tint: 0xd8d2c2,
    opacity: 0.72,
  },
  {
    name: 'Thick Dust',
    texture: '/image/dirt2.png',
    method: 'sweep',
    requiredActions: 2,
    minDay: 1,
    sizeRange: [0.86, 1.22],
    tint: 0xb9b0a0,
    opacity: 0.82,
  },
  {
    name: 'Coffee Spill',
    texture: '/image/coffeSpill.png',
    method: 'mop',
    requiredActions: 2,
    minDay: 2,
    sizeRange: [0.88, 1.34],
    tint: 0x9b6a42,
    opacity: 0.86,
  },
  {
    name: 'Sauce Stain',
    texture: '/image/blood.png',
    method: 'mop',
    requiredActions: 3,
    minDay: 3,
    sizeRange: [0.80, 1.18],
    tint: 0xa74735,
    opacity: 0.82,
  },
  {
    name: 'Stubborn Dirt',
    texture: '/image/dirty1.jpg',
    method: 'sweep_then_mop',
    requiredActions: 2,
    minDay: 4,
    sizeRange: [0.95, 1.44],
    tint: 0x71624f,
    opacity: 0.88,
  },
  {
    name: 'Heavy Grime',
    texture: '/image/dirty1.jpg',
    method: 'sweep_then_mop',
    requiredActions: 3,
    minDay: 5,
    sizeRange: [1.12, 1.62],
    tint: 0x4e463b,
    opacity: 0.92,
  },
];

export interface DirtSpot {
  config: DirtConfig;
  mesh: THREE.Mesh;
  remainingActions: number;
  currentStep: 'needs_sweep' | 'needs_mop' | 'done';
  cleaning: boolean;
}

export class DirtSpawner {
  private textureLoader = new THREE.TextureLoader();
  private textureCache = new Map<string, THREE.Texture>();
  private spots: DirtSpot[] = [];
  private generation = 0;
  public group = new THREE.Group();

  public async spawnForDay(
    day: number,
    floorY: number,
    floorMeshes: THREE.Object3D[],
    dirtWeights?: Record<string, number>,
    spawnBounds?: THREE.Box3,
    reachablePoints?: THREE.Vector3[],
    dock?: THREE.Vector3,
  ): Promise<DirtSpot[]> {
    this.clearAll();
    const generation = this.generation;

    const targetCount = getLevelTuning(day).dirtSpots;
    const availableConfigs = DIRT_CONFIGS.filter((config) => config.minDay <= day);
    if (availableConfigs.length === 0) return [];
    await Promise.all([...new Set(availableConfigs.map(config => config.texture))].map(path => this.loadTexture(path)));
    if (generation !== this.generation) return [];

    const raycaster = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);
    const upDir = new THREE.Vector3(0, 1, 0);
    const area = this.getSpawnArea(spawnBounds);
    const candidates = reachablePoints?.filter(point => !dock || Math.hypot(point.x - dock.x, point.z - dock.z) > 0.7);
    const featured = day === 10 ? availableConfigs : [
      day <= 5
        ? availableConfigs.find(config => config.minDay === day)
        : [...availableConfigs].sort((a, b) => (dirtWeights?.[b.name] ?? 1) - (dirtWeights?.[a.name] ?? 1))[0],
    ];

    for (let attempts = 0; this.spots.length < targetCount && attempts < targetCount * 18; attempts += 1) {
      if (candidates && candidates.length === 0) break;
      const candidate = candidates?.[Math.floor(Math.random() * candidates.length)];
      const x = candidate?.x ?? THREE.MathUtils.lerp(area.minX, area.maxX, Math.random());
      const z = candidate?.z ?? THREE.MathUtils.lerp(area.minZ, area.maxZ, Math.random());

      if (!this.isValidFloorPosition(x, z, floorY, floorMeshes, raycaster, downDir, upDir)) continue;

      const config = featured[this.spots.length] ?? this.pickConfig(availableConfigs, dirtWeights);
      const size = DIRT_PLANE_SIZE * THREE.MathUtils.lerp(config.sizeRange[0], config.sizeRange[1], Math.random());

      const tooClose = this.spots.some((spot) => {
        const dx = spot.mesh.position.x - x;
        const dz = spot.mesh.position.z - z;
        return Math.hypot(dx, dz) < Math.max(size, DIRT_PLANE_SIZE) * 1.35;
      });
      if (tooClose) continue;

      this.createSpot(config, x, z, size, candidate?.y ?? floorY);
    }

    if (!reachablePoints && this.spots.length < Math.min(targetCount, 4)) {
      const fallbackPositions = this.getFallbackPositions(area);
      for (const position of fallbackPositions) {
        if (this.spots.length >= Math.min(targetCount, 6)) break;

        const tooClose = this.spots.some((spot) => Math.hypot(spot.mesh.position.x - position.x, spot.mesh.position.z - position.z) < DIRT_PLANE_SIZE * 1.4);
        if (tooClose) continue;
        if (!this.isValidFloorPosition(position.x, position.z, floorY, floorMeshes, raycaster, downDir, upDir)) continue;

        const config = this.pickConfig(availableConfigs, dirtWeights);
        const size = DIRT_PLANE_SIZE * THREE.MathUtils.lerp(config.sizeRange[0], config.sizeRange[1], Math.random());
        this.createSpot(config, position.x, position.z, size, floorY);
      }
    }

    return this.spots;
  }

  public findNearestSpot(robotPos: THREE.Vector3, canInteract?: (spot: DirtSpot) => boolean, step?: DirtSpot['currentStep']): DirtSpot | null {
    let nearest: DirtSpot | null = null;
    let minDist = DIRT_INTERACT_DIST;

    for (const spot of this.spots) {
      if (spot.currentStep === 'done') continue;
      if (step && spot.currentStep !== step) continue;

      const dist = Math.hypot(spot.mesh.position.x - robotPos.x, spot.mesh.position.z - robotPos.z);
      if (dist < minDist && (!canInteract || canInteract(spot))) {
        minDist = dist;
        nearest = spot;
      }
    }

    return nearest;
  }

  public applySweep(spot: DirtSpot): 'wrong_tool' | 'progress' | 'cleaned' {
    if (spot.currentStep !== 'needs_sweep') return 'wrong_tool';

    spot.remainingActions -= 1;

    if (spot.config.method === 'sweep_then_mop' && spot.remainingActions > 0) {
      spot.currentStep = 'needs_mop';
      this.updateSpotVisual(spot, 0x8fb8c5, 0.62);
      return 'progress';
    }

    if (spot.remainingActions <= 0) {
      spot.currentStep = 'done';
      this.removeSpot(spot);
      return 'cleaned';
    }

    this.updateSpotVisual(spot);
    return 'progress';
  }

  public applyMop(spot: DirtSpot): 'wrong_tool' | 'progress' | 'cleaned' {
    if (spot.currentStep !== 'needs_mop') return 'wrong_tool';

    spot.remainingActions -= 1;

    if (spot.remainingActions <= 0) {
      spot.currentStep = 'done';
      this.removeSpot(spot);
      return 'cleaned';
    }

    this.updateSpotVisual(spot, 0x93c9a2);
    return 'progress';
  }

  public clearAll() {
    this.generation += 1;
    for (const spot of this.spots) {
      if (spot.currentStep !== 'done') this.disposeSpot(spot);
    }
    this.spots = [];
  }

  public isAllCleaned(): boolean {
    return this.spots.every((spot) => spot.currentStep === 'done');
  }

  public getRemainingCount(): number {
    return this.spots.filter((spot) => spot.currentStep !== 'done').length;
  }

  public getTotalCount(): number {
    return this.spots.length;
  }

  public getDebugInfo(): Array<{ name: string; position: { x: number; z: number }; remaining: number; step: string }> {
    return this.spots.map((spot) => ({
      name: spot.config.name,
      position: { x: spot.mesh.position.x, z: spot.mesh.position.z },
      remaining: spot.remainingActions,
      step: spot.currentStep,
    }));
  }

  public forceRefresh() {
    this.spots.forEach((spot) => {
      const material = spot.mesh.material as THREE.MeshStandardMaterial;
      material.needsUpdate = true;
    });
  }

  public highlightSpot(target: DirtSpot | null, enabled: boolean, robotPosition: THREE.Vector3) {
    for (const spot of this.spots) {
      if (spot.currentStep === 'done') continue;
      const outline = spot.mesh.userData.outline as THREE.LineSegments | undefined;
      if (!outline) continue;
      const selected = spot === target;
      const distance = Math.hypot(spot.mesh.position.x - robotPosition.x, spot.mesh.position.z - robotPosition.z);
      outline.visible = enabled && (selected || distance < 1.2);
      const material = outline.material as THREE.LineBasicMaterial;
      material.opacity = selected ? .95 : .3;
      material.color.setHex(spot.currentStep === 'needs_mop' ? 0x526e78 : 0xb36c35);
    }
  }

  private createSpot(config: DirtConfig, x: number, z: number, size: number, floorY: number) {
    const texture = this.textureCache.get(config.texture);
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: config.tint,
      transparent: true,
      opacity: config.opacity,
      alphaTest: 0.06,
      roughness: 0.98,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.position.set(x, floorY + 0.018 + Math.random() * 0.004, z);
    mesh.receiveShadow = true;
    mesh.userData.dirtName = config.name;
    mesh.userData.cleanMethod = config.method;
    // Broken corners mark the work area without covering the stain texture.
    const vertices: number[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const edge = size * .56;
      const length = size * .18;
      vertices.push(sx * (edge - length), sy * edge, .003, sx * edge, sy * edge, .003);
      vertices.push(sx * edge, sy * edge, .003, sx * edge, sy * (edge - length), .003);
      if (config.method === 'sweep_then_mop') {
        vertices.push(sx * (edge - length), sy * (edge + .018), .003, sx * (edge + .018), sy * (edge + .018), .003);
      }
    }
    const outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const outline = new THREE.LineSegments(outlineGeometry, new THREE.LineBasicMaterial({ color: config.method === 'mop' ? 0x526e78 : 0xb36c35, transparent: true, opacity: .3, depthWrite: false }));
    outline.visible = false;
    mesh.add(outline);
    mesh.userData.outline = outline;

    this.spots.push({
      config,
      mesh,
      remainingActions: config.requiredActions,
      currentStep: config.method === 'mop' ? 'needs_mop' : 'needs_sweep',
      cleaning: false,
    });
    this.group.add(mesh);
  }

  private getFallbackPositions(area: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const insetX = Math.max(0.25, (area.maxX - area.minX) * 0.18);
    const insetZ = Math.max(0.25, (area.maxZ - area.minZ) * 0.18);
    const minX = area.minX + insetX;
    const maxX = area.maxX - insetX;
    const minZ = area.minZ + insetZ;
    const maxZ = area.maxZ - insetZ;

    return [
      { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 },
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: minX, z: maxZ },
      { x: maxX, z: maxZ },
      { x: (minX + maxX) / 2, z: minZ },
      { x: (minX + maxX) / 2, z: maxZ },
    ];
  }

  private getSpawnArea(spawnBounds?: THREE.Box3) {
    if (spawnBounds && !spawnBounds.isEmpty()) {
      return {
        minX: spawnBounds.min.x,
        maxX: spawnBounds.max.x,
        minZ: spawnBounds.min.z,
        maxZ: spawnBounds.max.z,
      };
    }

    return { minX: -3, maxX: 3, minZ: -3, maxZ: 3 };
  }

  private pickConfig(configs: DirtConfig[], weights?: Record<string, number>): DirtConfig {
    if (!weights) return configs[Math.floor(Math.random() * configs.length)];

    let total = 0;
    for (const config of configs) {
      const weight = weights[config.name] ?? 1;
      if (weight > 0) total += weight;
    }

    if (total <= 0) return configs[Math.floor(Math.random() * configs.length)];

    let cursor = Math.random() * total;
    for (const config of configs) {
      const weight = weights[config.name] ?? 1;
      if (weight <= 0) continue;

      cursor -= weight;
      if (cursor <= 0) return config;
    }

    return configs[configs.length - 1];
  }

  private isValidFloorPosition(
    x: number,
    z: number,
    floorY: number,
    floorMeshes: THREE.Object3D[],
    raycaster: THREE.Raycaster,
    downDir: THREE.Vector3,
    upDir: THREE.Vector3
  ): boolean {
    if (!floorMeshes.length) return true;

    raycaster.set(new THREE.Vector3(x, floorY + 3, z), downDir);
    const hits = raycaster.intersectObjects(floorMeshes, true);
    const floorHit = hits.find((hit) => Math.abs(hit.point.y - floorY) <= 0.22);
    if (!floorHit) return false;

    raycaster.set(new THREE.Vector3(x, floorY + 0.05, z), upDir);
    const hitsUp = raycaster.intersectObjects(floorMeshes, true);
    return !(hitsUp.length > 0 && hitsUp[0].distance < 0.28);
  }

  private updateSpotVisual(spot: DirtSpot, tint?: number, forcedOpacity?: number) {
    const material = spot.mesh.material as THREE.MeshStandardMaterial;
    const progress = spot.remainingActions / spot.config.requiredActions;
    material.opacity = forcedOpacity ?? THREE.MathUtils.clamp(0.28 + progress * 0.62, 0.34, spot.config.opacity);
    if (tint) {
      material.color.setHex(tint);
    }
  }

  private removeSpot(spot: DirtSpot) {
    this.disposeSpot(spot);
  }

  private disposeSpot(spot: DirtSpot) {
    const outline = spot.mesh.userData.outline as THREE.LineSegments | undefined;
    if (outline) {
      outline.geometry.dispose();
      (outline.material as THREE.LineBasicMaterial).dispose();
    }
    const material = spot.mesh.material as THREE.MeshStandardMaterial;
    material.dispose();
    spot.mesh.geometry.dispose();
    this.group.remove(spot.mesh);
  }

  private async loadTexture(path: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(path);
    if (cached) return cached;

    return new Promise<THREE.Texture>((resolve) => {
      this.textureLoader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          this.textureCache.set(path, texture);
          resolve(texture);
        },
        undefined,
        () => {
          const fallback = this.createFallbackTexture();
          this.textureCache.set(path, fallback);
          resolve(fallback);
        }
      );
    });
  }

  private createFallbackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(48, 48, 4, 48, 48, 48);
      gradient.addColorStop(0, 'rgba(80, 62, 42, 0.9)');
      gradient.addColorStop(0.7, 'rgba(80, 62, 42, 0.42)');
      gradient.addColorStop(1, 'rgba(80, 62, 42, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 96, 96);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
