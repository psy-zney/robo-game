import * as THREE from 'three';
import { DIRT_PLANE_SIZE, DIRT_INTERACT_DIST } from '../utils/constants';

// Dirt types mapped to image files
export type CleanMethod = 'sweep' | 'mop' | 'sweep_then_mop';

export interface DirtConfig {
  /** Display name */
  name: string;
  /** Path to texture image */
  texture: string;
  /** Clean method */
  method: CleanMethod;
  /** Number of actions required */
  requiredActions: number;
  /** Day when this first appears (0 = Day 1) */
  minDay: number;
}

// Dirt configs based on images in public/image
export const DIRT_CONFIGS: DirtConfig[] = [
  { name: 'Dust',          texture: '/image/dirt.png',       method: 'sweep',          requiredActions: 1, minDay: 0 },
  { name: 'Thick Dust',    texture: '/image/dirt2.png',      method: 'sweep',          requiredActions: 2, minDay: 0 },
  { name: 'Coffee Spill',  texture: '/image/coffeSpill.png', method: 'mop',            requiredActions: 2, minDay: 1 },
  { name: 'Blood Stain',   texture: '/image/blood.png',      method: 'mop',            requiredActions: 3, minDay: 2 },
  { name: 'Stubborn Dirt', texture: '/image/dirty1.jpg',     method: 'sweep_then_mop', requiredActions: 2, minDay: 3 },
  { name: 'Heavy Grime',   texture: '/image/dirty.png',      method: 'sweep_then_mop', requiredActions: 3, minDay: 4 },
];

export interface DirtSpot {
  /** Cấu hình vết bẩn - Dirt configuration */
  config: DirtConfig;
  /** Mesh plane hiển thị trên sàn - Visual mesh on the floor */
  mesh: THREE.Mesh;
  /** Số lần dọn còn lại - Remaining action count */
  remainingActions: number;
  /** Trạng thái hiện tại (sweep_then_mop: cần quét trước rồi lau)
   * 'needs_sweep' | 'needs_mop' | 'done' */
  currentStep: 'needs_sweep' | 'needs_mop' | 'done';
  /** Đang được dọn bởi robot - Currently being cleaned */
  cleaning: boolean;
}

export class DirtSpawner {
  private textureLoader = new THREE.TextureLoader();
  private textureCache = new Map<string, THREE.Texture>();
  private spots: DirtSpot[] = [];
  public group = new THREE.Group();

  /**
   * Sinh vết bẩn cho ngày chỉ định - Spawn dirt spots for the given day
   * @param day Ngày hiện tại (bắt đầu từ 1) - Current day (starting from 1)
   * @param floorY Độ cao mặt sàn - Floor Y level
   * @param collidableMeshes Danh sách mesh có thể va chạm (để kiểm tra vị trí hợp lệ) - Collidable meshes for validation
   */
  public async spawnForDay(
    day: number,
    floorY: number,
    collidableMeshes: THREE.Object3D[]
  ): Promise<DirtSpot[]> {
    // Xóa vết bẩn cũ - Clear old spots
    this.clearAll();

    // Số vết bẩn tăng theo ngày - Dirt count increases per day
    const baseCount = 3;
    const count = baseCount + Math.floor(day * 1.5);

    // Lọc các loại vết bẩn hợp lệ cho ngày hiện tại - Filter configs available for this day
    const availableConfigs = DIRT_CONFIGS.filter(c => c.minDay < day);
    if (availableConfigs.length === 0) return [];

    const raycaster = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);
    const upDir = new THREE.Vector3(0, 1, 0);

    let attempts = 0;
    const maxAttempts = count * 10;

    while (this.spots.length < count && attempts < maxAttempts) {
      attempts++;

      // Random vị trí trong phạm vi phòng - Random position within room bounds
      const x = (Math.random() - 0.5) * 6;
      const z = (Math.random() - 0.5) * 6;

      // Kiểm tra vị trí hợp lệ (trên sàn, không trên tường/đồ vật) - Validate position
      if (!this.isValidFloorPosition(x, z, floorY, collidableMeshes, raycaster, downDir, upDir)) {
        continue;
      }

      // Kiểm tra không trùng vị trí vết bẩn khác - Check overlap with existing spots
      const tooClose = this.spots.some(s => {
        const dx = s.mesh.position.x - x;
        const dz = s.mesh.position.z - z;
        return Math.sqrt(dx * dx + dz * dz) < DIRT_PLANE_SIZE * 1.5;
      });
      if (tooClose) continue;

      // Random loại vết bẩn - Pick random dirt config
      const config = availableConfigs[Math.floor(Math.random() * availableConfigs.length)];

      // Tạo mesh plane - Create visual mesh
      const texture = await this.loadTexture(config.texture);
      const geometry = new THREE.PlaneGeometry(DIRT_PLANE_SIZE, DIRT_PLANE_SIZE);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        roughness: 0.95,
        metalness: 0,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, floorY + 0.005, z); // Nổi lên chút xíu so với sàn
      mesh.rotation.z = Math.random() * Math.PI * 2; // Xoay ngẫu nhiên cho tự nhiên
      mesh.receiveShadow = true;

      // Xác định trạng thái ban đầu - Determine initial step
      let currentStep: DirtSpot['currentStep'] = 'needs_sweep';
      if (config.method === 'mop') {
        currentStep = 'needs_mop';
      }

      const spot: DirtSpot = {
        config,
        mesh,
        remainingActions: config.requiredActions,
        currentStep,
        cleaning: false,
      };

      this.spots.push(spot);
      this.group.add(mesh);
    }

    return this.spots;
  }

  /**
   * Kiểm tra vị trí có nằm trên sàn hợp lệ hay không
   * Validate that position is on the floor (not on walls, under furniture, etc.)
   */
  private isValidFloorPosition(
    x: number, z: number, floorY: number,
    collidableMeshes: THREE.Object3D[],
    raycaster: THREE.Raycaster,
    downDir: THREE.Vector3,
    upDir: THREE.Vector3
  ): boolean {
    // Bắn tia từ trên xuống để kiểm tra có sàn tại vị trí này - Raycast down to check for floor
    const rayOrigin = new THREE.Vector3(x, floorY + 2, z);
    raycaster.set(rayOrigin, downDir);
    const hits = raycaster.intersectObjects(collidableMeshes, true);

    if (hits.length === 0) return false;

    // Điểm đầu tiên chạm phải gần mặt sàn (sai số 0.1m) - First hit must be near floor level
    const hitY = hits[0].point.y;
    if (Math.abs(hitY - floorY) > 0.15) return false;

    // Bắn tia từ dưới lên để kiểm tra không bị đồ vật đè - Raycast up to check nothing above
    const rayOriginUp = new THREE.Vector3(x, floorY + 0.01, z);
    raycaster.set(rayOriginUp, upDir);
    const hitsUp = raycaster.intersectObjects(collidableMeshes, true);

    // Nếu có vật thể ở rất gần phía trên (< 0.3m), vị trí không hợp lệ (dưới bàn, ghế...)
    if (hitsUp.length > 0 && hitsUp[0].distance < 0.3) {
      return false;
    }

    return true;
  }

  /**
   * Tìm vết bẩn gần nhất trong tầm tương tác - Find nearest dirt spot within interaction range
   */
  public findNearestSpot(robotPos: THREE.Vector3): DirtSpot | null {
    let nearest: DirtSpot | null = null;
    let minDist = DIRT_INTERACT_DIST;

    for (const spot of this.spots) {
      if (spot.currentStep === 'done') continue;
      const dx = spot.mesh.position.x - robotPos.x;
      const dz = spot.mesh.position.z - robotPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = spot;
      }
    }

    return nearest;
  }

  /**
   * Thực hiện hành động quét lên vết bẩn - Apply sweep action to a dirt spot
   * @returns Trạng thái kết quả - Result status
   */
  public applySweep(spot: DirtSpot): 'wrong_tool' | 'progress' | 'cleaned' {
    if (spot.currentStep !== 'needs_sweep') {
      return 'wrong_tool';
    }

    spot.remainingActions--;

    if (spot.config.method === 'sweep_then_mop' && spot.remainingActions > 0) {
      // Đã quét xong, chuyển sang lau - Swept, now needs mopping
      spot.currentStep = 'needs_mop';
      // Thay đổi opacity để thể hiện tiến trình
      (spot.mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;
      return 'progress';
    }

    if (spot.remainingActions <= 0) {
      spot.currentStep = 'done';
      this.removeSpot(spot);
      return 'cleaned';
    }

    // Giảm opacity để thể hiện tiến trình - Reduce opacity to show progress
    const progress = spot.remainingActions / spot.config.requiredActions;
    (spot.mesh.material as THREE.MeshStandardMaterial).opacity = 0.3 + progress * 0.7;
    return 'progress';
  }

  /**
   * Thực hiện hành động lau lên vết bẩn - Apply mop action to a dirt spot
   * @returns Trạng thái kết quả - Result status
   */
  public applyMop(spot: DirtSpot): 'wrong_tool' | 'progress' | 'cleaned' {
    if (spot.currentStep !== 'needs_mop') {
      return 'wrong_tool';
    }

    spot.remainingActions--;

    if (spot.remainingActions <= 0) {
      spot.currentStep = 'done';
      this.removeSpot(spot);
      return 'cleaned';
    }

    // Giảm opacity để thể hiện tiến trình - Reduce opacity to show progress
    const progress = spot.remainingActions / spot.config.requiredActions;
    (spot.mesh.material as THREE.MeshStandardMaterial).opacity = 0.3 + progress * 0.7;
    return 'progress';
  }

  /** Xóa 1 vết bẩn khỏi scene - Remove a single spot */
  private removeSpot(spot: DirtSpot) {
    const mesh = spot.mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.dispose();
    mesh.geometry.dispose();
    this.group.remove(mesh);
  }

  /** Xóa tất cả vết bẩn - Clear all spots */
  public clearAll() {
    for (const spot of this.spots) {
      const mat = spot.mesh.material as THREE.MeshStandardMaterial;
      mat.dispose();
      spot.mesh.geometry.dispose();
      this.group.remove(spot.mesh);
    }
    this.spots = [];
  }

  /** Kiểm tra đã dọn hết chưa - Check if all spots are cleaned */
  public isAllCleaned(): boolean {
    return this.spots.every(s => s.currentStep === 'done');
  }

  /** Đếm vết bẩn còn lại - Count remaining spots */
  public getRemainingCount(): number {
    return this.spots.filter(s => s.currentStep !== 'done').length;
  }

  /** Tổng số vết bẩn đã sinh - Total spots spawned */
  public getTotalCount(): number {
    return this.spots.length;
  }

  /** Load texture với cache - Load texture with caching */
  private async loadTexture(path: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(path);
    if (cached) return cached;

    return new Promise<THREE.Texture>((resolve) => {
      this.textureLoader.load(path, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        this.textureCache.set(path, tex);
        resolve(tex);
      }, undefined, () => {
        // Fallback texture nếu load thất bại - Fallback if load fails
        const fallback = new THREE.Texture();
        this.textureCache.set(path, fallback);
        resolve(fallback);
      });
    });
  }
}
