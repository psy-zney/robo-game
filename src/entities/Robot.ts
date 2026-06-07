import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';
import type { InputState } from '../core/InputManager';
import { ROBOT_HEIGHT, ROBOT_MODEL_TARGET_SIZE, ROBOT_RADIUS } from '../utils/constants';

export class Robot {
  public group = new THREE.Group();
  public cameraGroup = new THREE.Group();
  public robotModel: THREE.Group | undefined;
  public camera: THREE.PerspectiveCamera;

  private tempMovement = new THREE.Vector3();
  private tempPosition = new THREE.Vector3();
  private tempCenter = new THREE.Vector3();
  private tempSize = new THREE.Vector3();
  private tempBox = new THREE.Box3();

  private readonly CAMERA_HEIGHT = 0.62;
  private readonly CAMERA_FOV = 70;
  private readonly CAMERA_OFFSET_Z = 0.95;
  private readonly MIN_CAMERA_BOOM = 0.36;
  private readonly DEFAULT_PITCH = -0.48;
  private readonly MIN_PITCH = -0.72;
  private readonly MAX_PITCH = -0.18;

  constructor() {
    this.robotModel = assetManager.getModel('robot');
    if (this.robotModel) {
      this.robotModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Some source robot files include dog meshes. Hide them instead of
          // removing nodes because skinned children can share skeleton state.
          const name = mesh.name.toLowerCase();
          if (name.includes('husky') || name.includes('dog')) {
            mesh.visible = false;
          }
        }
      });

      this.scaleModelToWorld();
      this.robotModel.rotation.y = Math.PI;
      this.robotModel.position.x = -0.015;
      this.alignModelToGround();

      this.group.add(this.robotModel);
    }

    this.camera = new THREE.PerspectiveCamera(
      this.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );

    this.camera.position.set(0, this.CAMERA_HEIGHT, this.CAMERA_OFFSET_Z);
    this.camera.rotation.x = this.DEFAULT_PITCH;

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
    if (input.mouseDeltaX !== 0) {
      this.cameraGroup.rotation.y -= input.mouseDeltaX * 0.00115;
      input.mouseDeltaX = 0;
    }

    if (input.mouseDeltaY !== 0) {
      this.camera.rotation.x -= input.mouseDeltaY * 0.00075;
      this.camera.rotation.x = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.camera.rotation.x));
      input.mouseDeltaY = 0;
    }

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    this.tempMovement.set(0, 0, 0);

    if (moveX !== 0 || moveZ !== 0) {
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      dir.applyEuler(new THREE.Euler(0, this.cameraGroup.rotation.y, 0));
      this.tempMovement.copy(dir).multiplyScalar(speed * deltaTime * 60);
    }

    if (this.robotModel) {
      this.robotModel.rotation.y = this.cameraGroup.rotation.y + Math.PI;
    }

    return this.tempPosition.copy(this.group.position).add(this.tempMovement);
  }

  public setCameraHeight(height: number) {
    this.camera.position.y = height;
  }

  public setCameraFOV(fov: number) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  public resetCameraView() {
    this.camera.position.set(0, this.CAMERA_HEIGHT, this.CAMERA_OFFSET_Z);
    this.camera.rotation.x = this.DEFAULT_PITCH;
    this.cameraGroup.rotation.y = 0;
  }

  public setCameraBoomDistance(distance: number) {
    this.camera.position.z = Math.max(this.MIN_CAMERA_BOOM, Math.min(this.CAMERA_OFFSET_Z, distance));
  }

  public resetCameraBoomDistance() {
    this.camera.position.z = this.CAMERA_OFFSET_Z;
  }

  public getDefaultCameraBoomDistance() {
    return this.CAMERA_OFFSET_Z;
  }

  public getCameraSettings() {
    return {
      height: this.camera.position.y,
      fov: this.camera.fov,
      pitch: this.camera.rotation.x,
      minPitch: this.MIN_PITCH,
      maxPitch: this.MAX_PITCH,
    };
  }

  private scaleModelToWorld() {
    if (!this.robotModel) return;

    this.robotModel.scale.setScalar(1);
    this.robotModel.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.robotModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const dominantDim = Math.max(size.x, size.y, size.z);

    this.robotModel.scale.setScalar(dominantDim > 0 ? ROBOT_MODEL_TARGET_SIZE / dominantDim : 0.005);
    this.robotModel.updateMatrixWorld(true);
  }

  private alignModelToGround() {
    if (!this.robotModel) return;

    this.robotModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.robotModel);
    if (Number.isFinite(box.min.y)) {
      this.robotModel.position.y -= box.min.y;
      this.robotModel.position.y += 0.003;
      this.robotModel.updateMatrixWorld(true);
    }
  }
}
