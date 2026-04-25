import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';

export class Rat {
  public group = new THREE.Group();
  public model: THREE.Group | undefined;
  
  private targetPosition = new THREE.Vector3();
  private speed = 0.2; // Move faster so it doesn't look motionless
  private bounds = {
    minX: -4.0, maxX: 4.0,
    minZ: -4.0, maxZ: 4.0
  };
  private waitTimer = 0;

  constructor() {
    this.model = assetManager.getModel('Rat');
    if (this.model) {
      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      this.model.position.y = 0;

      // Auto-scale the rat to a realistic target size (~12cm = 0.12 units tall)
      // This is robust regardless of what scale the GLB was exported at
      this.model.scale.setScalar(1); // reset first
      this.model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const dominantDim = Math.max(size.x, size.y, size.z);
      const TARGET_RAT_SIZE = 0.12; // 12cm
      if (dominantDim > 0) {
        this.group.scale.setScalar(TARGET_RAT_SIZE / dominantDim);
      } else {
        this.group.scale.setScalar(0.002); // fallback
      }

      this.group.add(this.model);
    }
  }

  public spawn(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.pickNextTarget();
  }

  private pickNextTarget() {
    this.targetPosition.set(
      this.group.position.x + (Math.random() * 4 - 2),
      this.group.position.y,
      this.group.position.z + (Math.random() * 4 - 2)
    );
    // Clamp to bounds
    this.targetPosition.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.targetPosition.x));
    this.targetPosition.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.targetPosition.z));
    this.waitTimer = Math.random() * 2; // Wait a bit before moving
  }

  public update(deltaTime: number) {
    if (this.waitTimer > 0) {
      this.waitTimer -= deltaTime;
      return;
    }

    const dist = this.group.position.distanceTo(this.targetPosition);
    if (dist < 0.1) {
      this.pickNextTarget();
    } else {
      const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position).normalize();
      const moveDist = this.speed * deltaTime;
      this.group.position.addScaledVector(dir, moveDist);
      
      // Look at target (smoothly or directly)
      const targetRotation = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = targetRotation;
    }
  }
}
