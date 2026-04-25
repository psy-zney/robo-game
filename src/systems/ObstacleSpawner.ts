import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE } from '../utils/constants';
import { assetManager } from '../core/AssetManager';
import { obstacleModels } from '../utils/modelList';

export interface SpawnedObstacle {
  mesh: THREE.Object3D;
  bounds: THREE.Box3;
  /** Model name used for this obstacle - Tên model của chướng ngại vật */
  modelName: string;
}

// Realistic target heights (meters) per model - Chiều cao thực tế (đơn vị mét) của từng loại vật
const MODEL_TARGET_HEIGHT: Record<string, number> = {
  'Bag': 0.35,           // hand bag ~35cm
  'Bomb': 0.25,          // small bomb ~25cm
  'Couch': 0.85,         // sofa height ~85cm
  'Debris Papers': 0.05, // flat paper ~5cm
  'Dirty Plate': 0.06,   // plate ~6cm
  'Knife': 0.04,         // knife blade lying ~4cm
  'Marsey': 0.40,        // plush toy ~40cm
  'Simple Suitcase': 0.65, // luggage ~65cm
  'trah bag grey': 0.40, // trash bag ~40cm
};

export class ObstacleSpawner {
  private readonly modelNames: string[] = obstacleModels;

  constructor() { }

  /**
   * Generate obstacles for the current day, placed on the correct floor Y level.
   * Tạo các chướng ngại vật ngẫu nhiên đúng trên mặt sàn thực tế.
   * @param dayNumber - game day number
   * @param floorY - world Y of the floor surface from scene bounds
   * @param sceneBounds - bounding box of the scene to constrain spawn area
   * @param collidableMeshes - Array of meshes to raycast against
   */
  public generateDailyRoom(dayNumber: number, floorY = 0, sceneBounds?: THREE.Box3, collidableMeshes?: THREE.Object3D[]): SpawnedObstacle[] {
    const obstacleCount = Math.min(5 + Math.floor(dayNumber * 0.7), 14);

    // Use scene bounding box for spawn area if provided, else fall back to grid constants
    // Dùng bounds của scene thực tế nếu có, nguợc lại dùng hằng số lưới
    let halfX: number;
    let halfZ: number;
    if (sceneBounds && !sceneBounds.isEmpty()) {
      const size = new THREE.Vector3();
      sceneBounds.getSize(size);
      halfX = size.x / 2 * 0.85; // 15% margin from walls - Bờ 15% so với tường
      halfZ = size.z / 2 * 0.85;
    } else {
      halfX = (GRID_SIZE * CELL_SIZE) * 0.9 / 2 - 2.0;
      halfZ = halfX;
    }

    const obstacles: SpawnedObstacle[] = [];

    for (let index = 0; obstacles.length < obstacleCount && index < obstacleCount * 4; index += 1) {
      const x = Math.random() * halfX * 2 - halfX;
      const z = Math.random() * halfZ * 2 - halfZ;

      // Coordinates of fixed entities - Tọa độ của các thực thể cố định
      const robotStart = { x: 1.4, z: 31.3 };
      const huskyStart = { x: 7.5, z: -41.5 };

      // Prevent spawning too close to Robot or Husky - Không sinh chướng ngại vật quá gần Robot hoặc Husky
      const distToRobot = Math.hypot(x - robotStart.x, z - robotStart.z);
      const distToHusky = Math.hypot(x - huskyStart.x, z - huskyStart.z);
      
      if (distToRobot < 3 || distToHusky < 3) continue;

      if (obstacles.some((other) => Math.hypot(other.mesh.position.x - x, other.mesh.position.z - z) < 1.2)) {
        continue;
      }

      const modelName = this.modelNames[index % this.modelNames.length];
      let mesh: THREE.Object3D | undefined = assetManager.getModel(modelName);

      if (!mesh) {
        console.warn(`Obstacle model ${modelName} not found, skipping.`);
        continue;
      }

      // Apply shadows - Tùy chỉnh model bóng râm
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const childMesh = child as THREE.Mesh;
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });

      // Scale to realistic target height per model type - Scale theo chiều cao thực tế đặc trưng của từng loại vật
      mesh.scale.setScalar(1.0);
      mesh.updateMatrixWorld(true);
      const box0 = new THREE.Box3().setFromObject(mesh);
      const size0 = new THREE.Vector3();
      box0.getSize(size0);

      if (modelName === 'Rat') {
        mesh.scale.setScalar(0.01);
      } else {
        const targetH = MODEL_TARGET_HEIGHT[modelName] ?? 0.4;
        const dominantDim = Math.max(size0.x, size0.y, size0.z);
        if (dominantDim > 0) {
          // Scale so the tallest dimension maps to target height - Scale sao cho chiều lớn nhất bằng chiều cao mục tiêu
          mesh.scale.setScalar(targetH / dominantDim);
        }
      }

      mesh.rotation.y = Math.random() * Math.PI * 2;

      // Calculate placement height using raycasting
      let finalY = floorY;
      if (collidableMeshes && collidableMeshes.length > 0) {
        const raycaster = new THREE.Raycaster(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(collidableMeshes, true);
        if (intersects.length > 0) {
          finalY = intersects[0].point.y;
        }
      }

      // Place on actual floor/surface level - Đặt vật trên mặt sàn thực tế
      mesh.position.set(x, finalY, z);
      mesh.updateMatrixWorld(true);
      const boxFinal = new THREE.Box3().setFromObject(mesh);
      // Shift up so bottom of model sits exactly on the surface
      mesh.position.y += finalY - boxFinal.min.y;

      mesh.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(mesh);
      obstacles.push({ mesh, bounds, modelName });
    }

    return obstacles;
  }
}
