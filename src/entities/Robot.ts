import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';
import type { InputState } from '../core/InputManager';
import type { GameSettings } from '../systems/SettingsStore';
import { ROBOT_HEIGHT, ROBOT_MODEL_TARGET_SIZE, ROBOT_RADIUS } from '../utils/constants';

export class Robot {
  public group = new THREE.Group();
  public cameraGroup = new THREE.Group();
  public robotModel: THREE.Group | undefined;
  public camera: THREE.PerspectiveCamera;

  private tempMovement = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private desiredVelocity = new THREE.Vector3();
  private movementRotation = new THREE.Euler();
  private visualGroup = new THREE.Group();
  private toolRing: THREE.Mesh;
  private animationTime = 0;
  private tempPosition = new THREE.Vector3();
  private tempCenter = new THREE.Vector3();
  private tempSize = new THREE.Vector3();
  private tempBox = new THREE.Box3();

  private readonly CAMERA_HEIGHT = 0.62;
  private readonly CAMERA_FOV = 70;
  private readonly CAMERA_OFFSET_Z = 0.95;
  private cameraMode: 'follow' | 'overhead' = 'follow';
  private sensitivity = 1;
  private invertY = false;
  private reducedMotion = false;
  private desiredBoom = 0.95;
  private desiredHeight = 0.62;
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

      this.visualGroup.add(this.robotModel);
    }

    this.group.add(this.visualGroup);
    this.toolRing = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.23, 32),
      new THREE.MeshBasicMaterial({ color: 0xc18048, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.toolRing.rotation.x = -Math.PI / 2;
    this.toolRing.position.y = 0.012;
    this.toolRing.visible = false;
    this.group.add(this.toolRing);

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
    this.stopMovement();
    this.resetCameraView();
    this.visualGroup.position.set(0, 0, 0);
    this.visualGroup.rotation.set(0, 0, 0);
    this.toolRing.visible = false;
    this.cameraGroup.position.set(0, 0, 0);
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
      this.cameraGroup.rotation.y -= input.mouseDeltaX * 0.00115 * this.sensitivity;
      input.mouseDeltaX = 0;
    }

    if (input.mouseDeltaY !== 0) {
      this.camera.rotation.x -= input.mouseDeltaY * 0.00075 * this.sensitivity * (this.invertY ? -1 : 1);
      const min = this.cameraMode === 'overhead' ? -1.52 : this.MIN_PITCH;
      const max = this.cameraMode === 'overhead' ? -0.95 : this.MAX_PITCH;
      this.camera.rotation.x = Math.max(min, Math.min(max, this.camera.rotation.x));
      input.mouseDeltaY = 0;
    }

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (input.turn) this.cameraGroup.rotation.y += 1.8 * deltaTime;
    this.movementRotation.set(0, this.cameraGroup.rotation.y, 0);
    this.desiredVelocity.set(moveX, 0, moveZ).normalize().applyEuler(this.movementRotation).multiplyScalar(speed);
    this.velocity.lerp(this.desiredVelocity, 1 - Math.exp(-14 * deltaTime));
    if (this.velocity.lengthSq() < 0.0001) this.velocity.set(0, 0, 0);
    this.tempMovement.copy(this.velocity).multiplyScalar(deltaTime);

    if (this.robotModel) {
      const targetHeading = this.cameraGroup.rotation.y + Math.PI;
      const angle = Math.atan2(Math.sin(targetHeading - this.robotModel.rotation.y), Math.cos(targetHeading - this.robotModel.rotation.y));
      this.robotModel.rotation.y += angle * (1 - Math.exp(-12 * deltaTime));
    }

    return this.tempPosition.copy(this.group.position).add(this.tempMovement);
  }

  public stopMovement() {
    this.velocity.set(0, 0, 0);
  }

  public animate(deltaTime: number, actualSpeed: number, tool: 'sweep' | 'mop' | null) {
    this.animationTime += deltaTime;
    const movement = Math.min(1, actualSpeed / 1.56);
    const targetLean = this.reducedMotion ? 0 : movement * 0.025;
    this.visualGroup.rotation.x = THREE.MathUtils.damp(this.visualGroup.rotation.x, targetLean, 10, deltaTime);
    this.visualGroup.position.y = this.reducedMotion ? 0 : movement * Math.sin(this.animationTime * 18) * 0.0015;
    this.toolRing.visible = tool !== null;
    if (tool) {
      (this.toolRing.material as THREE.MeshBasicMaterial).color.setHex(tool === 'sweep' ? 0xc18048 : 0x64828a);
      this.toolRing.scale.setScalar(this.reducedMotion ? 1 : 1 + Math.sin(this.animationTime * 9) * 0.05);
    }
  }

  public setCameraHeight(height: number) {
    this.desiredHeight = height;
    this.camera.position.y = height;
  }

  public setCameraFOV(fov: number) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  public resetCameraView() {
    this.desiredBoom = this.cameraMode === 'overhead' ? 0.32 : this.CAMERA_OFFSET_Z;
    this.desiredHeight = this.cameraMode === 'overhead' ? 1.45 : this.CAMERA_HEIGHT;
    this.camera.position.set(0, this.desiredHeight, this.desiredBoom);
    this.camera.rotation.x = this.cameraMode === 'overhead' ? -1.34 : this.DEFAULT_PITCH;
    this.cameraGroup.rotation.y = 0;
  }

  public setCameraBoomDistance(distance: number) {
    const ratio = THREE.MathUtils.clamp(distance / this.desiredBoom, .08, 1);
    this.camera.position.z = this.desiredBoom * ratio;
    this.camera.position.y = .18 + (this.desiredHeight - .18) * ratio;
  }

  public resetCameraBoomDistance() {
    this.camera.position.z = this.desiredBoom;
    this.camera.position.y = this.desiredHeight;
  }

  public getDefaultCameraBoomDistance() {
    return this.desiredBoom;
  }

  public applySettings(settings: GameSettings) {
    const modeChanged = settings.cameraMode !== this.cameraMode;
    this.cameraMode = settings.cameraMode;
    this.sensitivity = settings.sensitivity;
    this.invertY = settings.invertY;
    this.reducedMotion = settings.reducedMotion;
    this.setCameraFOV(settings.fov);
    if (modeChanged) {
      const yaw = this.cameraGroup.rotation.y;
      this.resetCameraView();
      this.cameraGroup.rotation.y = yaw;
    }
  }

  public zoomCamera(delta: number) {
    if (this.cameraMode === 'overhead') this.desiredHeight = THREE.MathUtils.clamp(this.desiredHeight + delta * .001, .8, 1.8);
    else {
      this.desiredBoom = THREE.MathUtils.clamp(this.desiredBoom + delta * .001, .45, 1.6);
      this.desiredHeight = this.desiredBoom * .65;
    }
    this.camera.rotation.x = -Math.atan2(this.desiredHeight - .1, this.desiredBoom);
  }

  public getCameraSettings() {
    return {
      height: this.desiredHeight,
      fov: this.camera.fov,
      pitch: this.camera.rotation.x,
      minPitch: this.MIN_PITCH,
      maxPitch: this.MAX_PITCH,
      mode: this.cameraMode,
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
