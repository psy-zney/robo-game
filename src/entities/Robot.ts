import * as THREE from 'three';
import { ROBOT_HEIGHT, ROBOT_RADIUS, ROTATION_SPEED } from '../utils/constants';
import type { InputState } from '../core/InputManager';
import { assetManager } from '../core/AssetManager';

export class Robot {
  public group = new THREE.Group();
  public camera: THREE.PerspectiveCamera;

  private tempForward = new THREE.Vector3();
  private tempMovement = new THREE.Vector3();
  private tempPosition = new THREE.Vector3();
  private tempCenter = new THREE.Vector3();
  private tempSize = new THREE.Vector3();
  private tempBox = new THREE.Box3();

  constructor() {
    const roombaModel = assetManager.getModel('roomba');
    if (roombaModel) {
      // Traverse the model to apply shadows and filter out unwanted parts - Duyệt model để bật bóng đổ và lọc rác
      const toRemove: THREE.Mesh[] = [];
      roombaModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          // Detect and separate accidentally grouped Husky inside the roomba file - Tách vật thể Husky bị dính lây trong roomba.glb
          mesh.geometry.computeBoundingBox();
          if (mesh.geometry.boundingBox) {
            const center = new THREE.Vector3();
            mesh.geometry.boundingBox.getCenter(center);
            // If the mesh is hovering high up or named husky - Nếu mesh bay lơ lửng ở trên cao hoặc có tên Husky
            if (center.y > 0.5 || mesh.name.toLowerCase().includes('husky')) {
              toRemove.push(mesh);
            }
          }
        }
      });
      // Physically separate the unwanted meshes - Tách hẳn các object rác ra khỏi model
      toRemove.forEach(mesh => mesh.removeFromParent());
      // Calculate bounding box after cleanup to scale Roomba to 0.15m height - Tính toán hộp giới hạn chuẩn để ép chiều cao Roomba = 0.15m
      const box = new THREE.Box3().setFromObject(roombaModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 0) {
        const scale = 0.15 / size.y;
        roombaModel.scale.setScalar(scale);
      }
      roombaModel.updateMatrixWorld(true);
      const finalBox = new THREE.Box3().setFromObject(roombaModel);
      
      // Auto-ground the robot so its wheels touch the local group floor regardless of origin in GLB - Tự động đẩy Roomba cho bánh xe chạm mặt sàn
      roombaModel.position.y = -finalBox.min.y + 0.05;
      this.group.add(roombaModel);
    } else {
      // Fallback if no model is loaded - Dự phòng nếu không có model
      const robotGeometry = new THREE.CylinderGeometry(ROBOT_RADIUS, ROBOT_RADIUS, ROBOT_HEIGHT, 24);
      const robotMaterial = new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.4, metalness: 0.2 });
      const robotMesh = new THREE.Mesh(robotGeometry, robotMaterial);
      robotMesh.position.y = ROBOT_HEIGHT / 2; // Offset for cylinder origin - Đẩy tâm cylinder lên
      this.group.add(robotMesh);
    }

    // Initialize 3rd-person camera - Khởi tạo camera góc nhìn thứ 3
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera farther back and higher up for a clear view - Kéo camera lùi ra xa và cao lên xíu
    this.camera.position.set(0, 1.2, 1.5);
    this.camera.rotation.x = -0.5;
    this.group.add(this.camera);
  }

  public getPosition(destination?: THREE.Vector3): THREE.Vector3 {
    if (destination) {
      return destination.copy(this.group.position);
    }
    return this.group.position.clone();
  }

  public getBoundingBox(position?: THREE.Vector3, destination?: THREE.Box3): THREE.Box3 {
    const center = position ?? this.group.position;
    this.tempCenter.set(center.x, center.y + ROBOT_HEIGHT / 2, center.z);
    this.tempSize.set(ROBOT_RADIUS * 2, ROBOT_HEIGHT, ROBOT_RADIUS * 2);

    if (destination) {
      return destination.setFromCenterAndSize(this.tempCenter, this.tempSize);
    }

    return this.tempBox.setFromCenterAndSize(this.tempCenter, this.tempSize);
  }

  public update(deltaTime: number, input: InputState, speed: number): THREE.Vector3 {
    if (!input.forward && !input.backward && !input.left && !input.right && !input.turn) {
      return this.tempPosition.copy(this.group.position);
    }

    if (input.left) {
      this.group.rotation.y += ROTATION_SPEED * deltaTime * 60;
    }
    if (input.right) {
      this.group.rotation.y -= ROTATION_SPEED * deltaTime * 60;
    }
    if (input.turn) {
      this.group.rotation.y += Math.PI;
    }

    this.tempForward.set(0, 0, -1).applyQuaternion(this.group.quaternion);
    this.tempMovement.set(0, 0, 0);
    if (input.forward) {
      this.tempMovement.addScaledVector(this.tempForward, speed * deltaTime * 60);
    }
    if (input.backward) {
      this.tempMovement.addScaledVector(this.tempForward, -speed * deltaTime * 60);
    }

    return this.tempPosition.copy(this.group.position).add(this.tempMovement);
  }
}
