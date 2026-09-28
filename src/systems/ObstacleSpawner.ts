import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';
import {
  CELL_SIZE,
  getLevelTuning,
  GRID_SIZE,
  SPAWN_CLEAR_RADIUS,
} from '../utils/constants';
import { obstacleModels } from '../utils/modelList';

export interface SpawnedObstacle {
  mesh: THREE.Object3D;
  bounds: THREE.Box3;
  modelName: string;
}

const MODEL_TARGET_SIZE: Record<string, number> = {
  Bag: 0.38,
  Bomb: 0.24,
  Couch: 1.55,
  'Debris Papers': 0.42,
  'Dirty Plate': 0.28,
  Knife: 0.36,
  Marsey: 0.38,
  'Simple Suitcase': 0.70,
  'trah bag grey': 0.48,
};

const ROBOT_START = { x: 0.0, z: 0.85 };
const HUSKY_START = { x: 0.337, z: -1.868 };

export class ObstacleSpawner {
  private readonly modelNames: string[] = obstacleModels;

  public generateDailyRoom(
    dayNumber: number,
    floorY = 0,
    sceneBounds?: THREE.Box3,
    floorMeshes?: THREE.Object3D[],
    protectedPositions: THREE.Vector3[] = [new THREE.Vector3(ROBOT_START.x, floorY, ROBOT_START.z), new THREE.Vector3(HUSKY_START.x, floorY, HUSKY_START.z)],
  ): SpawnedObstacle[] {
    const obstacleCount = getLevelTuning(dayNumber).obstacles;
    const spawnArea = this.getSpawnArea(sceneBounds);
    const obstacles: SpawnedObstacle[] = [];
    const raycaster = new THREE.Raycaster();

    for (let attempt = 0; obstacles.length < obstacleCount && attempt < obstacleCount * 12; attempt += 1) {
      const x = THREE.MathUtils.lerp(spawnArea.minX, spawnArea.maxX, Math.random());
      const z = THREE.MathUtils.lerp(spawnArea.minZ, spawnArea.maxZ, Math.random());

      if (protectedPositions.some(point => Math.hypot(x - point.x, z - point.z) < SPAWN_CLEAR_RADIUS)) continue;
      if (obstacles.some((other) => Math.hypot(other.mesh.position.x - x, other.mesh.position.z - z) < 0.72)) continue;

      const modelName = this.modelNames[(attempt + dayNumber) % this.modelNames.length];
      const mesh = assetManager.getModel(modelName);
      if (!mesh) {
        console.warn(`Obstacle model ${modelName} not found, skipping.`);
        continue;
      }

      this.prepareModel(mesh, modelName);
      mesh.rotation.y = Math.random() * Math.PI * 2;

      const finalY = this.findSurfaceY(x, z, floorY, floorMeshes, raycaster);
      if (finalY === undefined) continue;
      mesh.position.set(x, finalY, z);
      mesh.updateMatrixWorld(true);

      const boxBeforeLift = new THREE.Box3().setFromObject(mesh);
      mesh.position.y += finalY - boxBeforeLift.min.y;
      mesh.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(mesh);
      if (sceneBounds && (bounds.min.x < sceneBounds.min.x || bounds.max.x > sceneBounds.max.x || bounds.min.z < sceneBounds.min.z || bounds.max.z > sceneBounds.max.z)) continue;
      if (protectedPositions.some(point => {
        const closestX = THREE.MathUtils.clamp(point.x, bounds.min.x, bounds.max.x);
        const closestZ = THREE.MathUtils.clamp(point.z, bounds.min.z, bounds.max.z);
        return Math.hypot(closestX - point.x, closestZ - point.z) < SPAWN_CLEAR_RADIUS;
      })) continue;
      if (obstacles.some(other => bounds.clone().expandByScalar(0.2).intersectsBox(other.bounds))) continue;
      obstacles.push({
        mesh,
        bounds,
        modelName,
      });
    }

    return obstacles;
  }

  private getSpawnArea(sceneBounds?: THREE.Box3) {
    if (sceneBounds && !sceneBounds.isEmpty()) {
      return {
        minX: sceneBounds.min.x,
        maxX: sceneBounds.max.x,
        minZ: sceneBounds.min.z,
        maxZ: sceneBounds.max.z,
      };
    }

    const half = (GRID_SIZE * CELL_SIZE) * 0.45 - 2.0;
    return { minX: -half, maxX: half, minZ: -half, maxZ: half };
  }

  private prepareModel(mesh: THREE.Object3D, modelName: string) {
    mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const childMesh = child as THREE.Mesh;
        childMesh.castShadow = true;
        childMesh.receiveShadow = true;
      }
    });

    mesh.scale.setScalar(1);
    mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const dominantDim = Math.max(size.x, size.y, size.z);
    const targetSize = MODEL_TARGET_SIZE[modelName] ?? 0.4;

    if (dominantDim > 0) {
      mesh.scale.setScalar(targetSize / dominantDim);
    }
  }

  private findSurfaceY(
    x: number,
    z: number,
    floorY: number,
    floorMeshes: THREE.Object3D[] | undefined,
    raycaster: THREE.Raycaster
  ) {
    if (!floorMeshes?.length) return floorY;

    raycaster.set(new THREE.Vector3(x, floorY + 5, z), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(floorMeshes, true);
    const floorHit = intersects.find((hit) => Math.abs(hit.point.y - floorY) < 0.22);

    if (!floorHit) return undefined;
    raycaster.set(new THREE.Vector3(x, floorY + 0.05, z), new THREE.Vector3(0, 1, 0));
    const overhead = raycaster.intersectObjects(floorMeshes, true)[0];
    return overhead && overhead.distance < 0.3 ? undefined : floorHit.point.y;
  }
}
