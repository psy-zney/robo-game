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
    floorMeshes?: THREE.Object3D[]
  ): SpawnedObstacle[] {
    const obstacleCount = getLevelTuning(dayNumber).obstacles;
    const spawnArea = this.getSpawnArea(sceneBounds);
    const obstacles: SpawnedObstacle[] = [];
    const raycaster = new THREE.Raycaster();

    for (let attempt = 0; obstacles.length < obstacleCount && attempt < obstacleCount * 12; attempt += 1) {
      const x = THREE.MathUtils.lerp(spawnArea.minX, spawnArea.maxX, Math.random());
      const z = THREE.MathUtils.lerp(spawnArea.minZ, spawnArea.maxZ, Math.random());

      if (!this.isClearOfStarts(x, z)) continue;
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
      mesh.position.set(x, finalY, z);
      mesh.updateMatrixWorld(true);

      const boxBeforeLift = new THREE.Box3().setFromObject(mesh);
      mesh.position.y += finalY - boxBeforeLift.min.y;
      mesh.updateMatrixWorld(true);

      obstacles.push({
        mesh,
        bounds: new THREE.Box3().setFromObject(mesh),
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

  private isClearOfStarts(x: number, z: number) {
    return (
      Math.hypot(x - ROBOT_START.x, z - ROBOT_START.z) >= SPAWN_CLEAR_RADIUS &&
      Math.hypot(x - HUSKY_START.x, z - HUSKY_START.z) >= SPAWN_CLEAR_RADIUS
    );
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

    return floorHit?.point.y ?? floorY;
  }
}
