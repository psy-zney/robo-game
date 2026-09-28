import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';
import { HUSKY_MODEL_TARGET_SIZE } from '../utils/constants';
import { CharacterAnimator } from '../core/CharacterAnimator';
import type { CharacterAnimation } from '../core/CharacterAnimator';

export type HuskyState = 'idle' | 'walk' | 'lie' | 'alert' | 'attack' | 'chase' | 'curious';

export class Husky {
  public group = new THREE.Group();
  public model: THREE.Group | undefined;
  
  public state: HuskyState = 'idle';
  private stateTimer = 0;
  
  private alertIcon!: THREE.Sprite;
  private attackRing!: THREE.Mesh;
  
  private targetPosition = new THREE.Vector3();
  private speed = 0.15; // Nerfed walk speed
  private floorY = 0;
  private lastPosition = new THREE.Vector3();
  private bounds = {
    minX: -3.0, maxX: 3.0,
    minZ: -3.0, maxZ: 3.0
  };

  private tempBox = new THREE.Box3();
  
  private animator?: CharacterAnimator;

  // Tuning: these represent "expected" world-units-per-second for timeScale=1
  private readonly WALK_SPEED_REF = 0.45;
  private readonly RUN_SPEED_REF = 1.25;

  constructor() {
    this.model = assetManager.getModel('husky');
    if (this.model) {
      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      // Reset offset first; we'll align feet-to-ground after scaling.
      this.model.position.y = 0;
      this.group.add(this.model);

      // Auto-scale Husky to ~40cm tall (realistic dog height)
      this.model.scale.setScalar(1);
      this.model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const dominantDim = Math.max(size.x, size.y, size.z);
      if (dominantDim > 0) {
        this.model.scale.setScalar(HUSKY_MODEL_TARGET_SIZE / dominantDim);
      } else {
        this.model.scale.setScalar(0.05);
      }

      // Align model so its lowest point touches group's local y=0.
      this.alignFeetToGround();

      this.animator = new CharacterAnimator(this.model, assetManager.getAnimations('husky'));
    }

    // Create Alert Icon (Exclamation mark)
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.font = 'bold 50px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', 32, 48);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.alertIcon = new THREE.Sprite(mat);
    this.alertIcon.scale.set(0.18, 0.18, 1);
    this.alertIcon.position.y = 0.45;
    this.alertIcon.visible = false;
    this.group.add(this.alertIcon);

    // Dynamic Attack Ring
    const ringGeo = new THREE.RingGeometry(0.30, 0.34, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    this.attackRing = new THREE.Mesh(ringGeo, ringMat);
    this.attackRing.rotation.x = -Math.PI / 2;
    this.attackRing.position.y = 0.02; // Slightly above ground
    this.attackRing.visible = false;
    this.group.add(this.attackRing);
  }

  private alignFeetToGround() {
    if (!this.model) return;
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model);
    const minY = box.min.y;
    if (Number.isFinite(minY)) {
      // Move model up/down so minY becomes 0 in group local space.
      this.model.position.y -= minY;
      this.model.updateMatrixWorld(true);
    }
  }

  public spawn(x: number, y: number, z: number) {
    this.floorY = y;
    this.group.position.set(x, y, z);
    this.lastPosition.copy(this.group.position);
    this.bounds = {
      minX: -4.0, maxX: 4.0,
      minZ: -4.0, maxZ: 4.0
    };
    this.pickNextState();
  }

  public setBounds(bounds: THREE.Box3) {
    this.bounds = {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z
    };
  }

  private playAnimation(name: CharacterAnimation, speed = 1) {
    this.animator?.play(name, speed);
  }

  private random(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  public startChase() {
    if (this.state === 'alert' || this.state === 'chase' || this.state === 'attack') return;
    this.state = 'alert';
    this.stateTimer = 0.9;
    this.speed = 0;
    this.alertIcon.visible = true;
    this.playAnimation('idle');
  }

  public onContact() {
    this.state = 'attack';
    this.stateTimer = 0.65;
    this.speed = 0;
    this.playAnimation('attack');
  }

  public startCurious() {
    this.state = 'curious';
    this.stateTimer = 5; // Sniff for 5 seconds
    this.speed = 0; // Stop moving
    this.alertIcon.visible = false;
    this.playAnimation('idle'); // Or 'sniff' if available
  }

  private pickNextState() {
    this.speed = 0.15;
    this.alertIcon.visible = false;
    const rand = Math.random();
    if (rand < 0.6) {
      // Walk to a random position in bounds
      this.state = 'walk';
      this.stateTimer = this.random(4, 10);
      this.targetPosition.set(
        this.random(this.bounds.minX, this.bounds.maxX),
        this.group.position.y,
        this.random(this.bounds.minZ, this.bounds.maxZ)
      );
      this.playAnimation('walk');
    } else if (rand < 0.85) {
      this.state = 'idle';
      this.stateTimer = this.random(2, 5);
      this.playAnimation('idle');
    } else {
      this.state = 'lie';
      this.stateTimer = this.random(3, 7);
      this.playAnimation('lie');
    }
  }

  public getBoundingBox(destination?: THREE.Box3): THREE.Box3 {
    const center = this.group.position;
    this.tempBox.setFromCenterAndSize(
      new THREE.Vector3(center.x, center.y + 0.15, center.z), 
      new THREE.Vector3(0.3, 0.3, 0.3) 
    );
    if (destination) {
      return destination.copy(this.tempBox);
    }
    return this.tempBox;
  }

  public update(
    deltaTime: number, 
    checkCollision?: (origin: THREE.Vector3, dir: THREE.Vector3, dist: number) => boolean,
    checkLOS?: (from: THREE.Vector3, to: THREE.Vector3) => boolean, // Returns TRUE if wall blocks LOS
    targetPlayer?: THREE.Vector3,
    isPlayerMoving?: boolean,
    isPlayerCleaning?: boolean,
    getGroundY?: (x: number, z: number, fromY: number) => number | undefined
  ) {
    // Ground snap: use floorY fallback, but prefer raycast ground height when available.
    const groundY = getGroundY ? getGroundY(this.group.position.x, this.group.position.z, this.floorY + 1.0) : undefined;
    this.group.position.y = groundY ?? this.floorY;

    // Toggle Attack Ring visibility dynamically
    this.attackRing.visible = (this.state === 'alert' || this.state === 'chase' || this.state === 'attack');

    this.stateTimer -= deltaTime;
    if (this.stateTimer <= 0) {
      if (this.state === 'alert') {
        this.state = 'chase';
        this.stateTimer = 6;
        this.speed = 1.08;
      } else if (this.state === 'attack') this.startCurious();
      else this.pickNextState();
    }

    // Stealth Mechanic Check — only when Husky can actually SEE the player
    if (this.state === 'chase' && targetPlayer) {
      const distToPlayer = this.group.position.distanceTo(targetPlayer);
      // Check LOS: if a wall is blocking, husky cannot perceive the player
      const huskyEye = this.group.position.clone().setY(this.group.position.y + 0.3);
      const wallBlocking = checkLOS ? checkLOS(huskyEye, targetPlayer.clone().setY(huskyEye.y)) : false;
      if (wallBlocking && this.state === 'chase') {
        // Lost sight of player — abort chase
        this.pickNextState();
      } else if (distToPlayer < 1.5 && !isPlayerMoving && !isPlayerCleaning && !wallBlocking) {
        this.startCurious();
      }
    }

    if (this.state === 'walk' || this.state === 'chase') {
      if (this.state === 'chase' && targetPlayer) {
        this.targetPosition.copy(targetPlayer);
        this.targetPosition.y = this.group.position.y;
      }

      const dist = this.group.position.distanceTo(this.targetPosition);
      if (dist < 0.1 && this.state !== 'chase') {
        this.pickNextState();
      } else if (dist > 0.05) {
        const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position).normalize();
        const moveDist = Math.min(dist, this.speed * deltaTime);
        
        let canMove = true;
        if (checkCollision) {
          const origin = this.group.position.clone();
          origin.y += 0.2;
          // During chase: use a smaller stop distance so Husky can navigate tight spaces
          const stopDist = this.state === 'chase' ? moveDist + 0.05 : moveDist + 0.25;
          if (checkCollision(origin, dir, stopDist)) {
            canMove = false;
          }
        }

        if (canMove) {
          const nextX = this.group.position.x + dir.x * moveDist;
          const nextZ = this.group.position.z + dir.z * moveDist;
          const nextY = getGroundY?.(nextX, nextZ, this.floorY + 1);
          if (nextX < this.bounds.minX || nextX > this.bounds.maxX || nextZ < this.bounds.minZ || nextZ > this.bounds.maxZ || (getGroundY && nextY === undefined)) {
            this.pickNextState();
          } else this.group.position.set(nextX, nextY ?? this.floorY, nextZ);
          // Only look at target if it's far enough to avoid jittering
          if (dist > 0.1) {
            const heading = Math.atan2(dir.x, dir.z);
            const angle = Math.atan2(Math.sin(heading - this.group.rotation.y), Math.cos(heading - this.group.rotation.y));
            this.group.rotation.y += angle * (1 - Math.exp(-10 * deltaTime));
          }
        } else if (this.state !== 'chase') {
          // If blocked while wandering, pick a new behavior and stop the "sliding walk" look.
          this.playAnimation('idle');
          this.pickNextState();
        }
      }
    }

    // === Animation sync to actual movement ===
    // Derive movement speed from real displacement, not from intended AI speed.
    const dx = this.group.position.x - this.lastPosition.x;
    const dz = this.group.position.z - this.lastPosition.z;
    const moved = Math.hypot(dx, dz);
    const moveSpeed = deltaTime > 0 ? moved / deltaTime : 0;
    this.lastPosition.copy(this.group.position);

    // If we're in a locomotion state but effectively not moving, avoid "moonwalking".
    const movingEnough = moveSpeed > 0.03;
    if (this.state === 'walk' || this.state === 'chase') {
      if (!movingEnough) {
        this.playAnimation('idle');
      } else {
        const isRun = this.state === 'chase' || moveSpeed > 0.75;
        const ref = isRun ? this.RUN_SPEED_REF : this.WALK_SPEED_REF;
        this.playAnimation(isRun ? 'run' : 'walk', THREE.MathUtils.clamp(moveSpeed / ref, 0.25, 1.8));
      }
    }
    this.animator?.update(deltaTime);
  }
}
