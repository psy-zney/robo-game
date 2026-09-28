import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';
import { RAT_MODEL_TARGET_SIZE } from '../utils/constants';
import { CharacterAnimator } from '../core/CharacterAnimator';

/**
 * Rat Entity - Chuột AI di chuyển ngẫu nhiên trong phòng
 * Rat Entity - Randomly moving mouse AI in the room
 */
export class Rat {
  public group = new THREE.Group();
  public model: THREE.Group | undefined;

  // Movement and AI properties
  private targetPosition = new THREE.Vector3();
  private speed = 0.15; // Realistic small animal movement speed
  private bounds = {
    minX: -3.5, maxX: 3.5,
    minZ: -3.5, maxZ: 3.5
  };
  private waitTimer = 0;
  private floorY = 0;
  private animator?: CharacterAnimator;
  private direction = new THREE.Vector3();
  private nextPosition = new THREE.Vector3();

  constructor() {
    this.model = assetManager.getModel('Rat');
    if (this.model) {
      // Setup shadows for all meshes
      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      // Reset model position to origin
      this.model.position.y = 0;

      this.scaleModelToWorld();

      this.group.add(this.model);
      this.animator = new CharacterAnimator(this.model, assetManager.getAnimations('Rat'));
    }
  }

  /**
   * Spawn rat at specified position
   * @param x - X coordinate
   * @param y - Y coordinate (floor level)
   * @param z - Z coordinate
   */
  public spawn(x: number, y: number, z: number) {
    this.floorY = y;
    this.group.position.set(x, y, z);
    this.pickNextTarget();
  }

  public setBounds(bounds: THREE.Box3) {
    this.bounds = {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z
    };
  }

  private scaleModelToWorld() {
    if (!this.model) return;

    this.group.scale.setScalar(1);
    this.model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const dominantDim = Math.max(size.x, size.y, size.z);

    this.model.scale.setScalar(dominantDim > 0 ? RAT_MODEL_TARGET_SIZE / dominantDim : 0.008);
    this.model.updateMatrixWorld(true);
    box.setFromObject(this.model);
    this.model.position.y -= box.min.y;
  }

  /**
   * Pick random target position within bounds
   */
  private pickNextTarget() {
    this.targetPosition.set(
      this.group.position.x + (Math.random() * 4 - 2),
      this.floorY,
      this.group.position.z + (Math.random() * 4 - 2)
    );

    // Clamp to room bounds
    this.targetPosition.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.targetPosition.x));
    this.targetPosition.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.targetPosition.z));

    // Random wait time before moving
    this.waitTimer = Math.random() * 2 + 0.5;
  }

  /**
   * Update rat movement and AI
   * @param deltaTime - Time since last frame in seconds
   */
  public update(deltaTime: number, canTravel?: (from: THREE.Vector3, to: THREE.Vector3) => boolean, getGround?: (x: number, z: number) => number | undefined) {
    let moved = 0;
    // Wait before moving
    if (this.waitTimer > 0) {
      this.waitTimer -= deltaTime;
      this.animator?.play('idle');
      this.animator?.update(deltaTime);
      return;
    }

    const dist = this.group.position.distanceTo(this.targetPosition);

    // Pick new target when reached current one
    if (dist < 0.1) {
      this.pickNextTarget();
    } else {
      // Move towards target
      const dir = this.direction.subVectors(this.targetPosition, this.group.position).setY(0).normalize();
      const moveDist = Math.min(dist, this.speed * deltaTime);
      this.nextPosition.copy(this.group.position).addScaledVector(dir, moveDist);
      const ground = getGround?.(this.nextPosition.x, this.nextPosition.z);
      if ((!getGround || ground !== undefined) && (!canTravel || canTravel(this.group.position, this.nextPosition))) {
        this.nextPosition.y = ground ?? this.floorY;
        this.group.position.copy(this.nextPosition);
        moved = moveDist;
      } else this.pickNextTarget();

      // Face movement direction
      const targetRotation = Math.atan2(dir.x, dir.z);
      const angle = Math.atan2(Math.sin(targetRotation - this.group.rotation.y), Math.cos(targetRotation - this.group.rotation.y));
      this.group.rotation.y += angle * (1 - Math.exp(-10 * deltaTime));
    }
    this.animator?.play(moved > 0 ? 'walk' : 'idle', moved > 0 ? 0.65 : 1);
    this.animator?.update(deltaTime);
  }
}
