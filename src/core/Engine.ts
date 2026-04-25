import * as THREE from 'three';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { Robot } from '../entities/Robot';
import { GameState } from '../systems/GameState';
import { UIManager } from '../ui/UIManager';
import { assetManager } from './AssetManager';
import { Husky } from '../entities/Husky';
import { ObstacleSpawner } from '../systems/ObstacleSpawner';
import { DirtSpawner } from '../systems/DirtSpawner';
import {
  MOVE_SPEED, SWEEP_SPEED, MOP_SPEED, HOME_SCALE, ROBOT_RADIUS,
  CHARGE_RATE, CHARGE_RADIUS,
  BATTERY_DRAIN_MOVE, BATTERY_DRAIN_SWEEP, BATTERY_DRAIN_MOP,
  HUSKY_BARK_CHANCE, HUSKY_RANDOM_BITE_BASE, MAX_BATTERY
} from '../utils/constants';
import { Rat } from '../entities/Rat';

// Fixed robot spawn / charge station position
const ROBOT_SPAWN = { x: 2.146, y: -0.401, z: -0.474 };
const HUSKY_SPAWN = { x: 0.337, y: -0.412, z: -1.868 };

export class Engine {
  private scene = new THREE.Scene();
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private camera: THREE.PerspectiveCamera;

  // Core systems
  private input = new InputManager();
  private robot = new Robot();
  private husky = new Husky();
  private rat = new Rat();
  private gameState = new GameState();
  private uiManager = new UIManager();
  private audioManager = new AudioManager();
  private obstacleSpawner = new ObstacleSpawner();
  private dirtSpawner = new DirtSpawner();

  // Floor Y level
  private floorY = 0;

  // Game state variables
  private previousTime = performance.now();
  private isGameOver = false;
  private bumpTimer = 0;
  private day = 1;

  // Charge station visual
  private chargeStationMesh!: THREE.Mesh;
  private isCharging = false;
  private chargeSoundTimer = 0;

  // Sweep/Mop cooldown
  private actionCooldown = 0;
  private readonly ACTION_INTERVAL = 0.4; // 0.4s between actions

  // Husky random bite timer
  private huskyRandomTimer = 0;
  private readonly HUSKY_RANDOM_CHECK_INTERVAL = 5; // Check every 5s

  // Memory optimization (Zero allocation)
  private currentPosition = new THREE.Vector3();
  private currentBox = new THREE.Box3();
  private targetBox = new THREE.Box3();
  private raycaster = new THREE.Raycaster();
  private rayDir = new THREE.Vector3();

  private collidableMeshes: THREE.Object3D[] = [];
  public houseBounds = new THREE.Box3();

  constructor() {
    this.scene.background = new THREE.Color(0x222222);
    this.camera = this.robot.camera;
    this.audioManager.initOnUserGesture();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupRenderer();
    this.setupLights();
    this.setupScene();

    this.gameState.init(100);
    this.gameState.battery = MAX_BATTERY;
    this.updateHud('Ready');
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    this.scene.add(dirLight);
  }

  private setupScene() {
    const homeModel = assetManager.getModel('home');
    if (homeModel) {
      homeModel.scale.setScalar(HOME_SCALE);
      homeModel.position.set(0, 0, 0);
      homeModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      this.collidableMeshes.push(homeModel);
      this.scene.add(homeModel);
      homeModel.updateMatrixWorld(true);
      this.houseBounds.setFromObject(homeModel);
      this.floorY = -0.412;
    }

    // Charge station visual (glowing ring)
    this.createChargeStation();

    // Spawn Robot
    this.robot.spawn(ROBOT_SPAWN.x, ROBOT_SPAWN.y, ROBOT_SPAWN.z);
    this.scene.add(this.robot.group);

    // Spawn Husky
    this.husky.spawn(HUSKY_SPAWN.x, HUSKY_SPAWN.y, HUSKY_SPAWN.z);
    this.scene.add(this.husky.group);

    // Spawn Rat
    this.rat.spawn(1, this.floorY, 1);
    this.scene.add(this.rat.group);

    // Spawn obstacles
    const spawnBounds = new THREE.Box3(
      new THREE.Vector3(-3.5, this.floorY, -3.5),
      new THREE.Vector3(3.5, this.floorY + 2, 3.5)
    );
    const spawnedObstacles = this.obstacleSpawner.generateDailyRoom(1, this.floorY, spawnBounds);
    for (const obs of spawnedObstacles) {
      this.scene.add(obs.mesh);
    }

    // Spawn dirt for Day 1
    this.scene.add(this.dirtSpawner.group);
    this.spawnDirtForDay(this.day);

    // UI Reset Logic
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.robot.spawn(ROBOT_SPAWN.x, ROBOT_SPAWN.y, ROBOT_SPAWN.z);
        this.husky.spawn(HUSKY_SPAWN.x, HUSKY_SPAWN.y, HUSKY_SPAWN.z);
        this.isGameOver = false;
        this.gameState.battery = MAX_BATTERY;
        this.spawnDirtForDay(this.day);
        this.updateHud('Game Reset');
      });
    }
  }

  /** Create glowing ring for charge station */
  private createChargeStation() {
    const geo = new THREE.RingGeometry(0.3, CHARGE_RADIUS, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    this.chargeStationMesh = new THREE.Mesh(geo, mat);
    this.chargeStationMesh.rotation.x = -Math.PI / 2;
    this.chargeStationMesh.position.set(ROBOT_SPAWN.x, this.floorY + 0.005, ROBOT_SPAWN.z);
    this.scene.add(this.chargeStationMesh);
  }

  /** Spawn dirt for Day N */
  private async spawnDirtForDay(day: number) {
    await this.dirtSpawner.spawnForDay(day, this.floorY, this.collidableMeshes);
    const total = this.dirtSpawner.getTotalCount();
    this.gameState.totalCells = total;
    this.gameState.cleanedCells = 0;
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateHud(status: string) {
    this.uiManager.update(
      this.gameState.battery,
      this.gameState.cleanedCells,
      this.gameState.totalCells,
      this.gameState.storage,
      this.gameState.storageCapacity,
      status,
      this.day
    );
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const currentTime = performance.now();
    const deltaTime = Math.min(0.033, (currentTime - this.previousTime) / 1000);
    this.previousTime = currentTime;

    if (this.isGameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const pauseScreen = document.getElementById('pause-screen');
    if (!this.input.state.isLocked) {
      if (pauseScreen) pauseScreen.classList.add('active');
      this.audioManager.setMovement(false);
      this.renderer.render(this.scene, this.camera);
      return;
    } else {
      if (pauseScreen) pauseScreen.classList.remove('active');
    }

    // === Husky AI ===
    this.husky.update(deltaTime, (origin, dir, dist) => {
      this.raycaster.set(origin, dir);
      const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
      return intersects.length > 0 && intersects[0].distance < dist;
    }, this.currentPosition);

    // === Rat AI ===
    this.rat.update(deltaTime);

    // === Husky random bite check ===
    this.huskyRandomTimer += deltaTime;
    if (this.huskyRandomTimer >= this.HUSKY_RANDOM_CHECK_INTERVAL) {
      this.huskyRandomTimer = 0;
      const biteChance = HUSKY_RANDOM_BITE_BASE + (this.day - 1) * 0.01;
      if (Math.random() < biteChance && this.husky.state !== 'chase') {
        this.husky.startChase();
        this.audioManager.playBark();
      }
    }

    // === Robot movement ===
    this.robot.getPosition(this.currentPosition);
    
    let currentSpeed = MOVE_SPEED;
    if (this.input.state.mop) {
      currentSpeed = MOP_SPEED;
    } else if (this.input.state.suction) {
      currentSpeed = SWEEP_SPEED;
    }

    const targetPosition = this.robot.update(deltaTime, this.input.state, currentSpeed);
    this.robot.getBoundingBox(this.currentPosition, this.currentBox);
    this.robot.getBoundingBox(targetPosition, this.targetBox);

    const isMoving = !this.currentPosition.equals(targetPosition);
    let hitWall = false;

    if (isMoving) {
      this.rayDir.copy(targetPosition).sub(this.currentPosition);
      const dist = this.rayDir.length();
      if (dist > 0) {
        this.rayDir.normalize();
        const STOP_DIST = 0.08;
        const RAY_SPREAD = 0.14;
        const leftOffset1 = new THREE.Vector3(-this.rayDir.z, 0, this.rayDir.x).multiplyScalar(RAY_SPREAD);
        const rightOffset1 = new THREE.Vector3(this.rayDir.z, 0, -this.rayDir.x).multiplyScalar(RAY_SPREAD);
        const leftOffset2 = new THREE.Vector3(-this.rayDir.z, 0, this.rayDir.x).multiplyScalar(RAY_SPREAD * 0.5);
        const rightOffset2 = new THREE.Vector3(this.rayDir.z, 0, -this.rayDir.x).multiplyScalar(RAY_SPREAD * 0.5);

        const origins = [
          this.currentPosition.clone(),
          this.currentPosition.clone().add(leftOffset1),
          this.currentPosition.clone().add(rightOffset1),
          this.currentPosition.clone().add(leftOffset2),
          this.currentPosition.clone().add(rightOffset2)
        ];

        for (const origin of origins) {
          origin.y += 0.1;
          this.raycaster.set(origin, this.rayDir);
          const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
          if (intersects.length > 0 && intersects[0].distance < dist + STOP_DIST) {
            hitWall = true;
            break;
          }
        }
      }
    }

    // === Husky collision ===
    let hitHusky = false;
    const huskyDist = this.currentPosition.distanceTo(this.husky.group.position);
    
    // Husky's actual body radius is ~0.2, robot radius is ROBOT_RADIUS.
    if (huskyDist < ROBOT_RADIUS + 0.2) {
      hitHusky = true;
      hitWall = true;

      if (this.husky.state === 'chase') {
        this.audioManager.playBite();
        this.triggerGameOver('CAUGHT BY HUSKY! Robot destroyed.');
        return;
      } else {
        // Handle collision events
        if (Math.random() < HUSKY_BARK_CHANCE) {
          this.audioManager.playBark();
        } else {
          this.audioManager.playBite();
          this.triggerGameOver('ATTACKED BY HUSKY! Robot flipped over.');
          return;
        }
      }
    }

    // === Charge station logic ===
    const distToCharger = Math.hypot(
      this.currentPosition.x - ROBOT_SPAWN.x,
      this.currentPosition.z - ROBOT_SPAWN.z
    );
    this.isCharging = distToCharger < CHARGE_RADIUS && this.gameState.battery < MAX_BATTERY;

    if (this.isCharging) {
      this.gameState.battery = Math.min(MAX_BATTERY, this.gameState.battery + CHARGE_RATE * deltaTime);
      this.chargeSoundTimer += deltaTime;
      if (this.chargeSoundTimer >= 1.5) {
        this.chargeSoundTimer = 0;
        this.audioManager.playCharge();
      }
      const pulse = 0.4 + Math.sin(currentTime * 0.005) * 0.3;
      (this.chargeStationMesh.material as THREE.MeshStandardMaterial).opacity = pulse;
    }

    // === Battery drain ===
    let drainRate = 0;
    let status = 'Ready';

    if (this.isCharging) {
      status = `Charging... ${Math.round(this.gameState.battery)}%`;
      drainRate = 0; 
    } else if (this.input.state.suction) {
      drainRate = BATTERY_DRAIN_SWEEP;
      status = 'Sweeping...';
    } else if (this.input.state.mop) {
      drainRate = BATTERY_DRAIN_MOP;
      status = 'Mopping...';
    } else if (isMoving) {
      drainRate = BATTERY_DRAIN_MOVE;
      status = 'Moving...';
    }

    if (drainRate > 0) {
      this.gameState.battery = Math.max(0, this.gameState.battery - drainRate * deltaTime);
    }

    // === Game over when out of battery ===
    if (this.gameState.battery <= 0 && !this.isCharging) {
      this.triggerGameOver('OUT OF BATTERY! Robot failed to return to base.');
      return;
    }

    // === Sweep/Mop actions ===
    this.actionCooldown = Math.max(0, this.actionCooldown - deltaTime);

    if (this.actionCooldown <= 0) {
      const nearestDirt = this.dirtSpawner.findNearestSpot(this.currentPosition);

      if (this.input.state.suction && nearestDirt) {
        const result = this.dirtSpawner.applySweep(nearestDirt);
        this.actionCooldown = this.ACTION_INTERVAL;
        if (result === 'wrong_tool') {
          this.audioManager.playWrongTool();
          status = 'Needs MOP [R], not sweep!';
        } else if (result === 'cleaned') {
          this.audioManager.playClean();
          this.gameState.cleanedCells++;
          status = 'Swept clean!';
        } else {
          this.audioManager.playSweep();
          status = 'Sweeping...';
        }
      } else if (this.input.state.mop && nearestDirt) {
        const result = this.dirtSpawner.applyMop(nearestDirt);
        this.actionCooldown = this.ACTION_INTERVAL;
        if (result === 'wrong_tool') {
          this.audioManager.playWrongTool();
          status = 'Sweep [E] first!';
        } else if (result === 'cleaned') {
          this.audioManager.playClean();
          this.gameState.cleanedCells++;
          status = 'Mopped clean!';
        } else {
          this.audioManager.playMop();
          status = 'Mopping...';
        }
      }
    }

    // === Day complete check ===
    if (this.dirtSpawner.isAllCleaned() && this.gameState.totalCells > 0) {
      this.audioManager.playDayComplete();
      this.day++;
      this.gameState.day = this.day;
      this.gameState.battery = MAX_BATTERY; // Reward full battery
      this.spawnDirtForDay(this.day);
      status = `Day ${this.day - 1} Complete! Welcome to Day ${this.day}`;
    }

    // === Movement resolution ===
    if (this.bumpTimer > 0) {
      this.bumpTimer = Math.max(0, this.bumpTimer - deltaTime);
      status = 'Recovering...';
    } else if (hitWall && isMoving) {
      this.audioManager.setMovement(false);
      if (hitHusky) {
        status = 'Husky in the way!';
      } else {
        status = 'Hit wall!';
      }
    } else if (isMoving && this.gameState.battery > 0) {
      this.robot.group.position.copy(targetPosition);
      this.audioManager.setMovement(true);
    } else {
      this.audioManager.setMovement(false);
    }

    this.updateHud(status);
    this.renderer.render(this.scene, this.camera);
  };

  private triggerGameOver(message: string) {
    this.isGameOver = true;
    this.updateHud(message);
    this.audioManager.setMovement(false);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const gameOverScreen = document.getElementById('game-over-screen');
    const reasonText = document.getElementById('game-over-reason');
    const restartBtn = document.getElementById('restart-btn');

    if (gameOverScreen && reasonText && restartBtn) {
      reasonText.innerText = message.toUpperCase();
      gameOverScreen.classList.add('active');
      restartBtn.onclick = () => window.location.reload();
    }
  }
}