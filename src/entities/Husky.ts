import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';

export type HuskyState = 'idle' | 'walk' | 'lie' | 'attack';

export class Husky {
  public group = new THREE.Group();
  public model: THREE.Group | undefined;
  
  public state: HuskyState = 'idle';
  private stateTimer = 0;
  
  private targetPosition = new THREE.Vector3();
  private speed = 1.5; // units per second
  private bounds = {
    minX: -8, maxX: 8,
    minZ: -8, maxZ: 8
  };

  private tempBox = new THREE.Box3();
  
  constructor() {
    this.model = assetManager.getModel('husky');
    if (this.model) {
      // Scale down to 1/3 as requested - Giảm kích thước xuống còn 1/3 (0.2) theo yêu cầu của user
      this.model.scale.setScalar(0.2);
      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      // Center model and ignore dynamic Box3 y-offset calculation - Bỏ qua việc lấy thông số Box3 động dễ bị lỗi với SkinnedMesh
      this.model.position.y = 0;
      
      this.group.add(this.model);
    } else {
      // Fallback box if model fails to load - Khối hộp dự phòng nếu model bị hỏng
      const geo = new THREE.BoxGeometry(0.3, 0.6, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.3; // Local Y offset - Nâng cao tương đối với group gốc
      this.group.add(mesh);
    }
    
    // Exact requested start position - Đặt mặc định Husky ở vị trí chính xác người dùng yêu cầu
    let startX = 0.77; 
    let startZ = -47.9;

    this.group.position.set(startX, 1.5, startZ);
    
    // Anchor walk bounds securely around the starting position so it never wanders back to (0,0) - Ràng buộc biên độ đi dạo xung quanh tọa độ gốc
    this.bounds = {
      minX: startX - 3, maxX: startX + 3,
      minZ: startZ - 3, maxZ: startZ + 3
    };

    this.pickNextState();
  }

  private random(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  private pickNextState() {
    if (this.state === 'attack') return;
    
    const rand = Math.random();
    if (rand < 0.3) {
      this.state = 'walk';
      this.stateTimer = this.random(3, 8);
      this.targetPosition.set(
        this.random(this.bounds.minX, this.bounds.maxX),
        1.5,
        this.random(this.bounds.minZ, this.bounds.maxZ)
      );
      // Stand up to walk - Đứng dậy để đi dạo
      if (this.model) {
        this.model.rotation.z = 0;
        this.model.position.y = 0;
      }
    } else if (rand < 0.6) {
      this.state = 'idle';
      this.stateTimer = this.random(2, 5);
      // Stand up - Đứng dậy
      if (this.model) {
        this.model.rotation.z = 0;
        this.model.position.y = 0; // reset local Y
      }
    } else {
      this.state = 'lie';
      this.stateTimer = this.random(4, 10);
      // Fake lie down by rotating model 90 degrees around Z - Giả vờ nằm bằng cách lật ngang mô hình 90 độ
      if (this.model) {
          this.model.rotation.z = Math.PI / 2;
          this.model.position.y = 0.15; // lower to local ground - Hạ xuống cho sát đất
      }
    }
  }

  public getBoundingBox(destination?: THREE.Box3): THREE.Box3 {
    // Cannot use setFromObject for SkinnedMesh as it returns gigantic bounds - Không dùng setFromObject cho model vì SkinnedMesh sẽ trả về Box3 khổng lồ gây dính Game Over liên tục
    const center = this.group.position;
    this.tempBox.setFromCenterAndSize(
      new THREE.Vector3(center.x, center.y + 0.3, center.z), 
      new THREE.Vector3(0.6, 0.6, 1.0) // Manual bounding size
    );
    if (destination) {
      return destination.copy(this.tempBox);
    }
    return this.tempBox;
  }

  public attack(targetPos: THREE.Vector3) {
    this.state = 'attack';
    this.stateTimer = 5; // how long it stays in attack state - Thời gian giữ trạng thái cắn
    
    // Stand up and face the target - Bật dậy và quay mặt về phía mục tiêu
    if (this.model) {
        this.model.rotation.z = 0;
        this.model.position.y = 0;
    }
    
    this.group.lookAt(targetPos.x, this.group.position.y, targetPos.z);
  }

  public update(deltaTime: number) {
    if (this.state === 'attack') return;

    this.stateTimer -= deltaTime;
    if (this.stateTimer <= 0) {
      this.pickNextState();
    }

    // Walking pathfinding - Xử lý đường đi nếu đang ở trạng thái đi tản bộ
    if (this.state === 'walk') {
      const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
      dir.y = 0;
      const dist = dir.length();
      
      if (dist < 0.1) {
        this.pickNextState();
      } else {
        dir.normalize();
        const moveDist = Math.min(dist, this.speed * deltaTime);
        this.group.position.addScaledVector(dir, moveDist);
        
        // Face movement direction - Tự động quay mặt theo hướng di chuyển
        const targetRotation = Math.atan2(dir.x, dir.z);
        this.group.rotation.y = targetRotation;
      }
    }
  }
}
