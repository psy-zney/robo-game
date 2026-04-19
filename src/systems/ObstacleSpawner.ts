import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE } from '../utils/constants';
import { assetManager } from '../core/AssetManager';
import { obstacleModels } from '../utils/modelList';

export interface SpawnedObstacle {
  mesh: THREE.Object3D;
  bounds: THREE.Box3;
}

export class ObstacleSpawner {
  private readonly modelNames: string[] = obstacleModels;

  // Keep fallback geometry and material in case model fails to load - Giữ lại geometry cơ bản để làm fallback nếu model không load được
  private readonly fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
  private readonly fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x71573e });

  constructor() { }

  public generateDailyRoom(dayNumber: number): SpawnedObstacle[] {
    const obstacleCount = Math.min(5 + Math.floor(dayNumber * 0.7), 14);
    const halfFloor = (GRID_SIZE * CELL_SIZE) * 0.9 / 2 - 2.0; // Margin to ensure models do not fall out of bounds - Khoảng 20.5 để chắc chắn model không lọt ra ngoài nhà
    const safeRadius = 2.0;
    const obstacles: SpawnedObstacle[] = [];

    for (let index = 0; obstacles.length < obstacleCount && index < obstacleCount * 4; index += 1) {
      const x = Math.random() * halfFloor * 2 - halfFloor;
      const z = Math.random() * halfFloor * 2 - halfFloor;

      // Prevent spawning too close to the center spawn point - Không sinh chướng ngại vật quá gần khu vực xuất phát (0,0) của Roomba
      if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;

      if (obstacles.some((other) => Math.hypot(other.mesh.position.x - x, other.mesh.position.z - z) < 1.2)) {
        continue;
      }

      const modelName = this.modelNames[index % this.modelNames.length];
      let mesh: THREE.Object3D | undefined = assetManager.getModel(modelName);

      if (mesh) {
        // Prepare shadows - Tùy chỉnh model bóng râm
        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const childMesh = child as THREE.Mesh;
            childMesh.castShadow = true;
            childMesh.receiveShadow = true;
          }
        });

        // Auto scale to optimal height approx 0.3 - 0.8 meters - Tự động scale độ lớn sao cho chướng ngại vật có chiều cao tầm 0.3 - 0.8 mét
        mesh.updateMatrixWorld(true);
        let box = new THREE.Box3().setFromObject(mesh);
        let size = new THREE.Vector3();
        box.getSize(size);

        // Control max bound to prevent inflating flat items - Khống chế bằng Max Dimension tránh phóng to vô tính mảnh giấy
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const targetSize = 0.5 + Math.random() * 0.3;
          const scaleCorrect = targetSize / maxDim;
          mesh.scale.setScalar(scaleCorrect);
        }

        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.position.set(x, 1.5, z);

        // Place automatically on floor so min.y touches y=1.5 - Đặt tọa độ sao cho đáy của nó (min.y) chạm đúng trục y=1.5
        mesh.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(mesh);
        mesh.position.y += 1.5 - box.min.y;

        mesh.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(mesh);

        obstacles.push({ mesh, bounds });
      } else {
        // Fallback
        mesh = new THREE.Mesh(this.fallbackGeometry.clone(), this.fallbackMaterial.clone());
        const scale = 0.8 + Math.random() * 0.4;
        mesh.scale.setScalar(scale);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        (mesh as THREE.Mesh).geometry.computeBoundingBox();
        const height = (mesh as THREE.Mesh).geometry.boundingBox ? (mesh as THREE.Mesh).geometry.boundingBox!.max.y - (mesh as THREE.Mesh).geometry.boundingBox!.min.y : 1;
        mesh.position.set(x, (height * scale) / 2 + 1.5, z);
        mesh.updateMatrixWorld();
        const bounds = new THREE.Box3().setFromObject(mesh);
        obstacles.push({ mesh, bounds });
      }
    }

    return obstacles;
  }
}
