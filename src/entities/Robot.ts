import * as THREE from 'three';
import { ROBOT_HEIGHT, ROBOT_RADIUS } from '../utils/constants';
import type { InputState } from '../core/InputManager';
import { assetManager } from '../core/AssetManager';

export class Robot {
  public group = new THREE.Group();
  public cameraGroup = new THREE.Group();
  public robotModel: THREE.Group | undefined;
  public camera: THREE.PerspectiveCamera;

  // Pre-allocated memory for performance
  private tempMovement = new THREE.Vector3();
  private tempPosition = new THREE.Vector3();
  private tempCenter = new THREE.Vector3();
  private tempSize = new THREE.Vector3();
  private tempBox = new THREE.Box3();

  constructor() {
    this.robotModel = assetManager.getModel('robot');
    if (this.robotModel) {
      this.robotModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // FIX HUSKY GLITCH: Hide unwanted embedded meshes instead of removing them
          // SỬA LỖI HUSKY DÍNH VÀO ROBOT: Ẩn các lưới bị lẫn vào thay vì dùng lệnh remove gây lỗi
          if (mesh.name.toLowerCase().includes('husky') || mesh.name.toLowerCase().includes('dog')) {
            mesh.visible = false;
          }
        }
      });

      // Force scale to exactly 0.01 as tested in editor
      this.robotModel.scale.setScalar(0.003);

      // Slight offset to prevent Z-fighting with floor
      // Nâng nhẹ lên 1 chút xíu để không bị kẹt mặt sàn
      this.robotModel.position.y = 0.002;

      // ROTATION FIX: Rotate the model so the "dot" faces forward (-Z)
      this.robotModel.rotation.y = Math.PI;

      // Xóa logic căn tâm bằng Box3 vì nó bị lỗi do mô hình không đối xứng.
      // Thay vào đó, chỉnh tay bù trừ nhẹ sang trái (âm X) để căn giữa bằng mắt thường
      this.robotModel.position.x = -0.015;

      this.group.add(this.robotModel);
    }

    // POV camera setup (Attached to top of robot)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    this.camera.position.set(0, 0.15, 0.05); // Low camera, exactly at POV height, safely inside collision radius
    this.camera.rotation.x = -0.1; // Looking very slightly down

    // Use an independent camera group so mouse drag can look around WITHOUT rotating the robot body
    this.cameraGroup.add(this.camera);
    this.group.add(this.cameraGroup);
  }

  public spawn(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.group.rotation.set(0, 0, 0);
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
    // 1. Mouse movement rotates the camera (look around)
    if (input.mouseDeltaX !== 0) {
      this.cameraGroup.rotation.y -= input.mouseDeltaX * 0.002; // Mouse sensitivity X
      input.mouseDeltaX = 0; // Consume the input
    }
    if (input.mouseDeltaY !== 0) {
      this.camera.rotation.x -= input.mouseDeltaY * 0.002; // Mouse sensitivity Y
      // Clamp pitch to avoid looking inside the robot body
      this.camera.rotation.x = Math.max(-0.15, Math.min(Math.PI / 2.5, this.camera.rotation.x));
      input.mouseDeltaY = 0; // Consume the input
    }

    // 2. WASD Movement (Strafing relative to camera group)
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    this.tempMovement.set(0, 0, 0);

    if (moveX !== 0 || moveZ !== 0) {
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();

      // Apply camera's rotation to the movement direction
      dir.applyEuler(new THREE.Euler(0, this.cameraGroup.rotation.y, 0));

      this.tempMovement.copy(dir).multiplyScalar(speed * deltaTime * 60);
    }

    // Visual rotation: make the robot model ALWAYS face where the camera is looking
    if (this.robotModel) {
      // Add Math.PI because the model faces -Z by default
      this.robotModel.rotation.y = this.cameraGroup.rotation.y + Math.PI;
    }

    return this.tempPosition.copy(this.group.position).add(this.tempMovement);
  }
}