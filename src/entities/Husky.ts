import * as THREE from 'three';
import { assetManager } from '../core/AssetManager';

export type HuskyState = 'idle' | 'walk' | 'lie' | 'attack' | 'chase';

export class Husky {
  public group = new THREE.Group();
  public model: THREE.Group | undefined;
  
  public state: HuskyState = 'idle';
  private stateTimer = 0;
  
  private targetPosition = new THREE.Vector3();
  private speed = 0.15; // Nerfed walk speed
  private bounds = {
    minX: -3.0, maxX: 3.0,
    minZ: -3.0, maxZ: 3.0
  };

  private tempBox = new THREE.Box3();
  
  private mixer?: THREE.AnimationMixer;
  private animations: Record<string, THREE.AnimationAction> = {};
  private currentAction?: THREE.AnimationAction;

  constructor() {
    this.model = assetManager.getModel('husky');
    if (this.model) {
      this.group.scale.setScalar(0.05);

      this.model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      this.model.position.y = 0;
      this.group.add(this.model);

      const anims = assetManager.getAnimations('husky');
      if (anims && anims.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        anims.forEach(anim => {
          const name = anim.name.toLowerCase();
          if (name.includes('idle')) this.animations.idle = this.mixer!.clipAction(anim);
          else if (name.includes('run')) this.animations.run = this.mixer!.clipAction(anim);
          else if (name.includes('walk')) this.animations.walk = this.mixer!.clipAction(anim);
          else if (name.includes('attack') || name.includes('bite') || name.includes('jump')) this.animations.attack = this.mixer!.clipAction(anim);
          else if (name.includes('lie') || name.includes('sleep') || name.includes('sit')) this.animations.lie = this.mixer!.clipAction(anim);
        });
        
        if (!this.animations.idle && anims.length > 0) this.animations.idle = this.mixer.clipAction(anims[0]);
        if (!this.animations.walk && anims.length > 1) this.animations.walk = this.mixer.clipAction(anims[1]);
        if (!this.animations.run) this.animations.run = this.animations.walk;
        if (!this.animations.attack && anims.length > 2) this.animations.attack = this.mixer.clipAction(anims[2]);
        if (!this.animations.lie && anims.length > 3) this.animations.lie = this.mixer.clipAction(anims[3]);
      }
    }
  }

  public spawn(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.bounds = {
      minX: -4.0, maxX: 4.0,
      minZ: -4.0, maxZ: 4.0
    };
    this.pickNextState();
  }

  private playAnimation(name: string) {
    const action = this.animations[name] || this.animations.idle;
    if (action && this.currentAction !== action) {
      if (this.currentAction) {
        this.currentAction.fadeOut(0.2);
      }
      action.reset().fadeIn(0.2).play();
      this.currentAction = action;
    }
  }

  private random(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  public startChase() {
    this.state = 'chase';
    this.stateTimer = 15; // Give it 15 seconds to catch the player
    this.speed = 1.08; // Fast run (0.018 * 60 to match user spec)
    this.playAnimation('run');
  }

  private pickNextState() {
    this.speed = 0.15; // Reset to slow walk
    const rand = Math.random();
    if (rand < 0.2) { 
      this.state = 'attack';
      this.stateTimer = this.random(2, 4);
      this.playAnimation('attack');
    } else if (rand < 0.7) { 
      this.state = 'walk';
      this.stateTimer = this.random(4, 10);
      this.targetPosition.set(
        this.random(this.bounds.minX, this.bounds.maxX),
        this.group.position.y,
        this.random(this.bounds.minZ, this.bounds.maxZ)
      );
      this.playAnimation('walk');
    } else if (rand < 0.9) { 
      this.state = 'idle';
      this.stateTimer = this.random(2, 4);
      this.playAnimation('idle');
    } else { 
      this.state = 'lie';
      this.stateTimer = this.random(3, 6);
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

  public update(deltaTime: number, checkCollision?: (origin: THREE.Vector3, dir: THREE.Vector3, dist: number) => boolean, targetPlayer?: THREE.Vector3) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    this.stateTimer -= deltaTime;
    if (this.stateTimer <= 0 && this.state !== 'chase') {
      this.pickNextState();
    } else if (this.stateTimer <= 0 && this.state === 'chase') {
      // Gave up chasing after timer
      this.pickNextState();
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
        const moveDist = this.speed * deltaTime;
        
        let canMove = true;
        if (checkCollision && this.state !== 'chase') { // Don't check wall collision tightly when chasing to avoid getting stuck easily
          const origin = this.group.position.clone();
          origin.y += 0.2; 
          if (checkCollision(origin, dir, moveDist + 0.3)) {
            canMove = false;
          }
        }

        if (canMove) {
          this.group.position.addScaledVector(dir, moveDist);
          // Only look at target if it's far enough to avoid jittering
          if (dist > 0.1) {
            this.group.lookAt(this.targetPosition.x, this.group.position.y, this.targetPosition.z);
          }
        } else if (this.state !== 'chase') {
          this.pickNextState();
        }
      }
    }
  }
}
