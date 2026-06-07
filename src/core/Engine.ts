import * as THREE from 'three';
import { AudioManager } from './AudioManager';
import { assetManager } from './AssetManager';
import { InputManager } from './InputManager';
import { Husky } from '../entities/Husky';
import { Rat } from '../entities/Rat';
import { Robot } from '../entities/Robot';
import { DirtSpawner } from '../systems/DirtSpawner';
import { DustSpawner } from '../systems/DustSpawner';
import { GameState } from '../systems/GameState';
import { ObstacleSpawner } from '../systems/ObstacleSpawner';
import { SaveManager } from '../systems/SaveManager';
import { getDayStory, getDifficultyMultiplier, hasSpecialEvent } from '../systems/StorySystem';
import { UIManager } from '../ui/UIManager';
import {
  BATTERY_DRAIN_MOP,
  BATTERY_DRAIN_MOVE,
  BATTERY_DRAIN_SWEEP,
  CHARGE_RADIUS,
  CHARGE_RATE,
  HOME_SCALE,
  HUSKY_BARK_CHANCE,
  HUSKY_RANDOM_BITE_BASE,
  MAX_BATTERY,
  MOP_SPEED,
  MOVE_SPEED,
  SWEEP_SPEED,
  WORLD_MARGIN,
} from '../utils/constants';

const ROBOT_SPAWN_HINT = { x: 4.0, z: -0.8 };
const HUSKY_SPAWN = { x: 0.337, z: -1.868 };
const RAT_SPAWN = { x: 2.0, z: -1.5 };

export class Engine {
  private scene = new THREE.Scene();
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private camera: THREE.PerspectiveCamera;

  private input = new InputManager();
  private robot = new Robot();
  private husky = new Husky();
  private rat = new Rat();
  private gameState = new GameState();
  private uiManager = new UIManager();
  private audioManager = new AudioManager();
  private obstacleSpawner = new ObstacleSpawner();
  private dirtSpawner = new DirtSpawner();
  private dustSpawner: DustSpawner;

  private floorY = 0;
  private previousTime = performance.now();
  private isGameOver = false;
  private isAdvancingDay = false;
  private bumpTimer = 0;
  private bumpDir = new THREE.Vector3();
  private cameraShakeTimer = 0;
  private day = 1;
  private dayIntroTimer = 0;
  private dayMission = '';
  private wallHitCooldown = 0;

  private chargeStationMesh!: THREE.Mesh;
  private isCharging = false;
  private chargeSoundTimer = 0;

  private actionCooldown = 0;
  private readonly ACTION_INTERVAL = 0.34;

  private huskyRandomTimer = 0;
  private readonly HUSKY_RANDOM_CHECK_INTERVAL = 5;

  private cameraUpdateTimer = 0;
  private readonly CAMERA_UPDATE_INTERVAL = 0.5;

  private currentPosition = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private rayDir = new THREE.Vector3();
  private robotSpawn = new THREE.Vector3(ROBOT_SPAWN_HINT.x, 0, ROBOT_SPAWN_HINT.z);
  private huskySpawn = new THREE.Vector3(HUSKY_SPAWN.x, 0, HUSKY_SPAWN.z);
  private chargeStationPosition = new THREE.Vector3(ROBOT_SPAWN_HINT.x, 0, ROBOT_SPAWN_HINT.z);

  private collidableMeshes: THREE.Object3D[] = [];
  private floorMeshes: THREE.Object3D[] = [];
  private obstacleMeshes: THREE.Object3D[] = [];
  private playableBounds = new THREE.Box3(
    new THREE.Vector3(-3.5, 0, -3.5),
    new THREE.Vector3(3.5, 2, 3.5)
  );
  public houseBounds = new THREE.Box3();

  constructor(options?: { startDay?: number; startBattery?: number }) {
    this.scene.background = new THREE.Color(0x20242b);
    this.camera = this.robot.camera;
    this.audioManager.initOnUserGesture();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupRenderer();
    this.setupLights();

    this.day = Math.max(1, Math.floor(options?.startDay ?? 1));
    this.gameState.init(100);
    this.gameState.day = this.day;
    this.gameState.battery = Math.max(0, Math.min(MAX_BATTERY, options?.startBattery ?? MAX_BATTERY));

    this.dustSpawner = new DustSpawner(this.scene);
    this.audioManager.startMusic();
    this.setupScene();

    this.updateHud('Ready');
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xf2f6ff, 0.78);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xf6f1e8, 0.72);
    dirLight.position.set(5, 9, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1536, 1536);
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

      this.floorMeshes.push(homeModel);
      this.collidableMeshes.push(homeModel);
      this.scene.add(homeModel);

      homeModel.updateMatrixWorld(true);
      this.houseBounds.setFromObject(homeModel);
      this.floorY = this.detectFloorY(homeModel);
      this.playableBounds = this.createPlayableBounds(this.houseBounds, this.floorY);
    }

    this.resolveSpawnPoints();
    this.createChargeStation();

    this.robot.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
    this.scene.add(this.robot.group);

    this.husky.spawn(this.huskySpawn.x, this.huskySpawn.y, this.huskySpawn.z);
    this.husky.setBounds(this.playableBounds);
    this.scene.add(this.husky.group);

    const ratY = this.getGroundYAt(RAT_SPAWN.x, RAT_SPAWN.z, this.floorY + 2) ?? this.floorY;
    this.rat.spawn(RAT_SPAWN.x, ratY, RAT_SPAWN.z);
    this.rat.setBounds(this.playableBounds);
    this.scene.add(this.rat.group);

    this.spawnObstaclesForDay(this.day);

    this.scene.add(this.dirtSpawner.group);
    void this.spawnDirtForDay(this.day);

    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.robot.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
      this.husky.spawn(this.huskySpawn.x, this.huskySpawn.y, this.huskySpawn.z);
      this.husky.setBounds(this.playableBounds);
      this.isGameOver = false;
      this.gameState.battery = MAX_BATTERY;
      this.spawnObstaclesForDay(this.day);
      void this.spawnDirtForDay(this.day);
      this.updateHud('Game Reset');
    });

    const musicBtn = document.getElementById('music-btn');
    musicBtn?.addEventListener('click', () => {
      this.toggleMusic();
      musicBtn.textContent = this.audioManager.isMusicPlaying() ? 'MUSIC ON' : 'MUSIC OFF';
    });
  }

  private detectFloorY(homeModel: THREE.Object3D): number {
    const bounds = new THREE.Box3().setFromObject(homeModel);
    const samples = [
      { x: ROBOT_SPAWN_HINT.x, z: ROBOT_SPAWN_HINT.z },
      { x: 0, z: 0 },
      { x: -1.5, z: 0 },
      { x: 1.5, z: 0 },
      { x: 0, z: -1.5 },
      { x: 0, z: 1.5 },
    ];
    const yValues: number[] = [];

    for (const sample of samples) {
      this.raycaster.set(new THREE.Vector3(sample.x, bounds.max.y + 1, sample.z), new THREE.Vector3(0, -1, 0));
      const hits = this.raycaster.intersectObject(homeModel, true);
      for (const hit of hits) {
        if (hit.point.y >= bounds.min.y - 0.05 && hit.point.y <= bounds.max.y - 0.18) {
          yValues.push(hit.point.y);
        }
      }
    }

    if (!yValues.length) return bounds.min.y;

    yValues.sort((a, b) => a - b);
    return yValues[Math.min(Math.floor(yValues.length * 0.18), yValues.length - 1)];
  }

  private createPlayableBounds(sourceBounds: THREE.Box3, floorY: number): THREE.Box3 {
    if (sourceBounds.isEmpty()) {
      return new THREE.Box3(
        new THREE.Vector3(-3.5, floorY, -3.5),
        new THREE.Vector3(3.5, floorY + 2, 3.5)
      );
    }

    const bounds = new THREE.Box3(
      new THREE.Vector3(sourceBounds.min.x + WORLD_MARGIN, floorY, sourceBounds.min.z + WORLD_MARGIN),
      new THREE.Vector3(sourceBounds.max.x - WORLD_MARGIN, floorY + 2, sourceBounds.max.z - WORLD_MARGIN)
    );

    if (bounds.min.x >= bounds.max.x || bounds.min.z >= bounds.max.z) {
      return new THREE.Box3(
        new THREE.Vector3(-3.5, floorY, -3.5),
        new THREE.Vector3(3.5, floorY + 2, 3.5)
      );
    }

    return bounds;
  }

  private resolveSpawnPoints() {
    const cornerCandidates = this.getCornerSpawnCandidates();
    this.robotSpawn.copy(this.resolveSpawnPoint(cornerCandidates[0], cornerCandidates.slice(1)));

    this.huskySpawn.copy(this.resolveSpawnPoint(HUSKY_SPAWN, [
      { x: -0.9, z: -1.15 },
      { x: 0.9, z: -1.15 },
      { x: 0.0, z: -1.45 },
    ], this.robotSpawn, 1.25));

    this.chargeStationPosition.copy(this.robotSpawn);
    this.chargeStationPosition.y = this.floorY + 0.008;
  }

  private resolveSpawnPoint(
    preferred: { x: number; z: number },
    fallbacks: Array<{ x: number; z: number }> = [],
    avoidPoint?: THREE.Vector3,
    avoidRadius = 0
  ): THREE.Vector3 {
    const center = this.playableBounds.getCenter(new THREE.Vector3());
    const seededCandidates = [
      preferred,
      ...fallbacks,
      { x: center.x, z: center.z },
    ];
    const candidates = [
      ...seededCandidates,
      ...this.createSpawnGridCandidates(center),
    ];

    let best: { point: THREE.Vector3; score: number } | null = null;

    for (const candidate of candidates) {
      const x = THREE.MathUtils.clamp(candidate.x, this.playableBounds.min.x, this.playableBounds.max.x);
      const z = THREE.MathUtils.clamp(candidate.z, this.playableBounds.min.z, this.playableBounds.max.z);
      if (avoidPoint && Math.hypot(x - avoidPoint.x, z - avoidPoint.z) < avoidRadius) continue;

      const groundY = this.getGroundYAt(x, z, this.floorY + 2);
      if (this.floorMeshes.length > 0 && groundY === undefined) continue;

      const y = groundY ?? this.floorY;
      if (!this.isPointInsidePlayableBounds(x, z)) continue;
      if (!this.hasSpawnClearance(x, y, z)) continue;

      const point = new THREE.Vector3(x, y, z);
      const preferredScore = Math.hypot(x - preferred.x, z - preferred.z);
      const centerPenalty = point.distanceTo(center) * 0.04;
      const seededBonus = seededCandidates.some((seed) => Math.abs(seed.x - candidate.x) < 0.001 && Math.abs(seed.z - candidate.z) < 0.001) ? -0.35 : 0;
      const score = preferredScore + centerPenalty + seededBonus;
      if (!best || score < best.score) {
        best = { point, score };
      }
    }

    if (best) return best.point;

    const fallbackY = this.getGroundYAt(center.x, center.z, this.floorY + 2) ?? this.floorY;
    return new THREE.Vector3(center.x, fallbackY, center.z);
  }

  private getCornerSpawnCandidates(): Array<{ x: number; z: number }> {
    const inset = 0.58;
    const right = this.playableBounds.max.x - inset;
    const left = this.playableBounds.min.x + inset;
    const front = this.playableBounds.min.z + inset;
    const back = this.playableBounds.max.z - inset;

    return [
      { x: right, z: front },
      { x: right, z: back },
      { x: left, z: front },
      { x: left, z: back },
      { x: ROBOT_SPAWN_HINT.x, z: ROBOT_SPAWN_HINT.z },
    ];
  }

  private createSpawnGridCandidates(center: THREE.Vector3): Array<{ x: number; z: number }> {
    const candidates: Array<{ x: number; z: number }> = [];
    const insetX = Math.max(0.2, (this.playableBounds.max.x - this.playableBounds.min.x) * 0.12);
    const insetZ = Math.max(0.2, (this.playableBounds.max.z - this.playableBounds.min.z) * 0.12);
    const minX = this.playableBounds.min.x + insetX;
    const maxX = this.playableBounds.max.x - insetX;
    const minZ = this.playableBounds.min.z + insetZ;
    const maxZ = this.playableBounds.max.z - insetZ;

    for (let ix = 0; ix < 5; ix += 1) {
      for (let iz = 0; iz < 5; iz += 1) {
        candidates.push({
          x: THREE.MathUtils.lerp(minX, maxX, ix / 4),
          z: THREE.MathUtils.lerp(minZ, maxZ, iz / 4),
        });
      }
    }

    candidates.sort((a, b) => Math.hypot(a.x - center.x, a.z - center.z) - Math.hypot(b.x - center.x, b.z - center.z));
    return candidates;
  }

  private hasSpawnClearance(x: number, y: number, z: number): boolean {
    if (!this.collidableMeshes.length) return true;

    const origin = new THREE.Vector3(x, y + 0.14, z);
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
    ];
    const minClearance = 0.55;

    for (const direction of directions) {
      this.raycaster.set(origin, direction);
      const hits = this.raycaster.intersectObjects(this.collidableMeshes, true);
      const blockingHit = hits.find((hit) => hit.distance > 0.02);
      if (blockingHit && blockingHit.distance < minClearance) {
        return false;
      }
    }

    return true;
  }

  private isPointInsidePlayableBounds(x: number, z: number) {
    return (
      x >= this.playableBounds.min.x &&
      x <= this.playableBounds.max.x &&
      z >= this.playableBounds.min.z &&
      z <= this.playableBounds.max.z
    );
  }

  private spawnObstaclesForDay(day: number) {
    for (const mesh of this.obstacleMeshes) {
      this.scene.remove(mesh);
      this.removeCollidable(mesh);
    }
    this.obstacleMeshes = [];

    const spawnedObstacles = this.obstacleSpawner.generateDailyRoom(
      day,
      this.floorY,
      this.playableBounds,
      this.floorMeshes
    );

    for (const obs of spawnedObstacles) {
      this.scene.add(obs.mesh);
      this.collidableMeshes.push(obs.mesh);
      this.obstacleMeshes.push(obs.mesh);
    }
  }

  private removeCollidable(mesh: THREE.Object3D) {
    const index = this.collidableMeshes.indexOf(mesh);
    if (index >= 0) {
      this.collidableMeshes.splice(index, 1);
    }
  }

  private createChargeStation() {
    const geo = new THREE.RingGeometry(0.24, CHARGE_RADIUS, 40);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4bf0b0,
      emissive: 0x24d68e,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    });
    this.chargeStationMesh = new THREE.Mesh(geo, mat);
    this.chargeStationMesh.rotation.x = -Math.PI / 2;
    this.chargeStationMesh.position.copy(this.chargeStationPosition);
    this.scene.add(this.chargeStationMesh);
  }

  private async spawnDirtForDay(day: number) {
    const story = getDayStory(day);
    this.dayMission = story.mission;
    this.dayIntroTimer = 3.5;

    if (hasSpecialEvent(day, 'reduced_battery')) {
      this.gameState.battery = Math.max(20, this.gameState.battery * 0.7);
    }

    await this.dirtSpawner.spawnForDay(day, this.floorY, this.floorMeshes, story.dirtWeights, this.playableBounds);
    this.dustSpawner.spawnForDay(day, this.floorY, story.dustColor, this.playableBounds);

    this.gameState.totalCells = this.dirtSpawner.getTotalCount();
    this.gameState.cleanedCells = 0;
    this.saveProgress();
  }

  private saveProgress() {
    const existing = SaveManager.load();
    const highestDay = Math.max(existing?.highestDay ?? 1, this.day);
    SaveManager.save({
      battery: this.gameState.battery,
      cleanedCount: this.gameState.cleanedCells,
      day: this.day,
      money: 0,
      highestDay,
      version: '1.0.0',
      timestamp: Date.now(),
      playtime: 0,
    });
  }

  public restartDay() {
    this.isGameOver = false;
    this.gameState.battery = MAX_BATTERY;
    this.robot.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
    this.husky.spawn(this.huskySpawn.x, this.huskySpawn.y, this.huskySpawn.z);
    this.husky.setBounds(this.playableBounds);
    this.spawnObstaclesForDay(this.day);
    void this.spawnDirtForDay(this.day);
    this.updateHud(`Restarting Day ${this.day}`);
  }

  public startMusic() {
    this.audioManager.startMusic();
  }

  public stopMusic() {
    this.audioManager.stopMusic();
  }

  public toggleMusic() {
    this.audioManager.toggleMusic();
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateHud(status: string) {
    const story = getDayStory(this.day);
    const difficultyMultiplier = getDifficultyMultiplier(this.day);
    const cameraSettings = this.robot.getCameraSettings();
    const cameraSettingsText = `H: ${(cameraSettings.height * 100).toFixed(0)}cm | FOV: ${cameraSettings.fov.toFixed(0)}deg`;

    this.uiManager.update(
      this.gameState.battery,
      this.gameState.cleanedCells,
      this.gameState.totalCells,
      this.gameState.storage,
      this.gameState.storageCapacity,
      status,
      this.day,
      this.dayMission || story.mission,
      difficultyMultiplier,
      cameraSettingsText,
      story.title
    );
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = Math.min(0.033, (currentTime - this.previousTime) / 1000);
    this.previousTime = currentTime;
    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - deltaTime);

    if (this.isGameOver) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const pauseScreen = document.getElementById('pause-screen');
    if (!this.input.state.isLocked) {
      pauseScreen?.classList.add('active');
      this.audioManager.setMovement(false);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    pauseScreen?.classList.remove('active');

    const isPlayerInputMoving = this.input.state.forward || this.input.state.backward || this.input.state.left || this.input.state.right;
    const isCleaning = this.input.state.suction || this.input.state.mop;

    this.handleCameraAdjustments(deltaTime);
    this.robot.getPosition(this.currentPosition);

    this.husky.update(
      deltaTime,
      (origin, dir, dist) => {
        this.raycaster.set(origin, dir);
        const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
        return intersects.length > 0 && intersects[0].distance < dist;
      },
      (from, to) => {
        const dir = new THREE.Vector3().subVectors(to, from).normalize();
        const dist = from.distanceTo(to);
        this.raycaster.set(from, dir);
        const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
        return intersects.length > 0 && intersects[0].distance < dist;
      },
      this.currentPosition,
      isPlayerInputMoving,
      isCleaning,
      (x, z, fromY) => this.getGroundYAt(x, z, fromY)
    );

    this.rat.update(deltaTime);
    this.dustSpawner.update(deltaTime);
    this.handleRandomHuskyBite(deltaTime);

    this.robot.getPosition(this.currentPosition);

    let currentSpeed = MOVE_SPEED;
    if (this.input.state.mop) {
      currentSpeed = MOP_SPEED;
    } else if (this.input.state.suction) {
      currentSpeed = SWEEP_SPEED;
    }

    const targetPosition = this.robot.update(deltaTime, this.input.state, currentSpeed);
    const isMoving = !this.currentPosition.equals(targetPosition);
    let hitWall = this.checkMovementCollision(targetPosition, isMoving);
    let hitHusky = false;

    const huskyPos = this.husky.group.position;
    const huskyDist = Math.min(this.currentPosition.distanceTo(huskyPos), targetPosition.distanceTo(huskyPos));
    if (huskyDist < 0.30) {
      hitHusky = true;
      hitWall = true;
      this.gameState.battery = Math.max(0, this.gameState.battery - 10);
      this.bumpTimer = 0.5;
      this.cameraShakeTimer = 0.25;
      this.bumpDir.copy(this.currentPosition).sub(huskyPos);
      this.bumpDir.y = 0;
      if (this.bumpDir.lengthSq() < 1e-6) {
        this.bumpDir.set(0, 0, 1);
      } else {
        this.bumpDir.normalize();
      }
      if (this.husky.state === 'chase' || Math.random() >= HUSKY_BARK_CHANCE) {
        this.audioManager.playBite();
      } else {
        this.audioManager.playBark();
      }
    }

    const distToCharger = Math.hypot(
      this.currentPosition.x - this.chargeStationPosition.x,
      this.currentPosition.z - this.chargeStationPosition.z
    );
    this.isCharging = distToCharger < CHARGE_RADIUS && this.gameState.battery < MAX_BATTERY;

    if (this.isCharging) {
      this.gameState.battery = Math.min(MAX_BATTERY, this.gameState.battery + CHARGE_RATE * deltaTime);
      this.chargeSoundTimer += deltaTime;
      if (this.chargeSoundTimer >= 1.5) {
        this.chargeSoundTimer = 0;
        this.audioManager.playCharge();
      }
      const pulse = 0.46 + Math.sin(currentTime * 0.005) * 0.22;
      (this.chargeStationMesh.material as THREE.MeshStandardMaterial).opacity = pulse;
    }

    let drainRate = 0;
    let status = 'Ready';
    const story = getDayStory(this.day);

    if (this.dayIntroTimer > 0) {
      this.dayIntroTimer = Math.max(0, this.dayIntroTimer - deltaTime);
      status = story.introStatus;
    }

    if (this.isCharging) {
      status = `Charging... ${Math.round(this.gameState.battery)}%`;
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
      if (Math.random() < 0.02) this.saveProgress();
    }

    if (this.gameState.battery <= 0 && !this.isCharging) {
      this.triggerGameOver('Out of battery. Robot failed to return to base.');
      return;
    }

    status = this.handleCleaning(deltaTime, status);

    if (!this.isAdvancingDay && this.dirtSpawner.isAllCleaned() && this.gameState.totalCells > 0) {
      status = `Day ${this.day} complete. Loading next level.`;
      void this.advanceDay();
    }

    if (this.bumpTimer > 0) {
      this.bumpTimer = Math.max(0, this.bumpTimer - deltaTime);
      status = 'Recovering...';
      this.robot.group.position.addScaledVector(this.bumpDir, 0.9 * deltaTime);
    } else if (hitWall && isMoving) {
      this.audioManager.setMovement(false);
      status = hitHusky ? 'Husky in the way!' : 'Obstacle detected.';
      if (!hitHusky && this.wallHitCooldown <= 0) {
        this.audioManager.playWallHit();
        this.wallHitCooldown = 0.45;
      }
    } else if (isMoving && this.gameState.battery > 0) {
      this.robot.group.position.copy(targetPosition);
      this.audioManager.setMovement(true);
    } else {
      this.audioManager.setMovement(false);
    }

    this.applyCameraShake(deltaTime);
    this.updateCameraOcclusion();
    this.updateHud(status);
    this.renderer.render(this.scene, this.camera);
  };

  private updateCameraOcclusion() {
    this.robot.resetCameraBoomDistance();
    const desiredCameraPosition = this.camera.getWorldPosition(new THREE.Vector3());
    const origin = this.robot.group.position.clone();
    origin.y += 0.18;

    const toCamera = desiredCameraPosition.sub(origin);
    const desiredDistance = toCamera.length();
    if (desiredDistance <= 0.1) {
      this.robot.resetCameraBoomDistance();
      return;
    }

    this.raycaster.set(origin, toCamera.normalize());
    const hits = this.raycaster.intersectObjects(this.collidableMeshes, true);
    const blockingHit = hits.find((hit) => hit.distance > 0.08 && hit.distance < desiredDistance - 0.05);

    if (!blockingHit) {
      this.robot.resetCameraBoomDistance();
      return;
    }

    const safeRatio = Math.max(0.35, (blockingHit.distance - 0.12) / desiredDistance);
    this.robot.setCameraBoomDistance(this.robot.getDefaultCameraBoomDistance() * safeRatio);
  }

  private getGroundYAt(x: number, z: number, fromY: number): number | undefined {
    if (!this.floorMeshes.length) return undefined;

    this.raycaster.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    const hits = this.raycaster.intersectObjects(this.floorMeshes, true);
    const hit = hits.find((entry) => Math.abs(entry.point.y - this.floorY) < 0.18);

    return hit?.point.y;
  }

  private handleRandomHuskyBite(deltaTime: number) {
    this.huskyRandomTimer += deltaTime;
    if (this.huskyRandomTimer < this.HUSKY_RANDOM_CHECK_INTERVAL) return;

    this.huskyRandomTimer = 0;
    const difficultyMultiplier = getDifficultyMultiplier(this.day);
    const biteChance = HUSKY_RANDOM_BITE_BASE * difficultyMultiplier + (this.day - 1) * 0.01;
    const aggressiveModifier = hasSpecialEvent(this.day, 'husky_aggressive') ? 1.5 : 1.0;

    if (Math.random() < biteChance * aggressiveModifier && this.husky.state !== 'chase') {
      this.husky.startChase();
      this.audioManager.playBark();
    }
  }

  private checkMovementCollision(targetPosition: THREE.Vector3, isMoving: boolean): boolean {
    if (!isMoving) return false;

    this.rayDir.copy(targetPosition).sub(this.currentPosition);
    const dist = this.rayDir.length();
    if (dist <= 0) return false;

    this.rayDir.normalize();
    const stopDist = 0.13;
    const raySpread = 0.14;
    const left = new THREE.Vector3(-this.rayDir.z, 0, this.rayDir.x);
    const right = new THREE.Vector3(this.rayDir.z, 0, -this.rayDir.x);
    const origins = [
      this.currentPosition,
      this.currentPosition.clone().addScaledVector(left, raySpread),
      this.currentPosition.clone().addScaledVector(right, raySpread),
      this.currentPosition.clone().addScaledVector(left, raySpread * 0.5),
      this.currentPosition.clone().addScaledVector(right, raySpread * 0.5),
    ];

    for (const origin of origins) {
      const rayOrigin = origin.clone();
      rayOrigin.y += 0.1;
      this.raycaster.set(rayOrigin, this.rayDir);
      const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
      if (intersects.length > 0 && intersects[0].distance < dist + stopDist) {
        return true;
      }
    }

    return false;
  }

  private handleCleaning(deltaTime: number, currentStatus: string): string {
    this.actionCooldown = Math.max(0, this.actionCooldown - deltaTime);
    this.uiManager.updateActionPrompt(this.input.state.suction, this.input.state.mop);

    if (this.actionCooldown > 0) return currentStatus;

    const nearestDirt = this.dirtSpawner.findNearestSpot(this.currentPosition);
    const isSweeping = this.input.state.suction;

    if (this.dustSpawner.checkCollision(this.currentPosition, isSweeping)) {
      this.audioManager.playSweep();
      currentStatus = 'Dust collected.';
    }

    if (isSweeping && nearestDirt) {
      const result = this.dirtSpawner.applySweep(nearestDirt);
      this.actionCooldown = this.ACTION_INTERVAL;
      if (result === 'wrong_tool') {
        this.audioManager.playWrongTool();
        return 'Needs mop [R].';
      }
      if (result === 'cleaned') {
        this.audioManager.playClean();
        this.gameState.cleanedCells += 1;
        return 'Swept clean.';
      }
      this.audioManager.playSweep();
      return 'Sweeping stain...';
    }

    if (this.input.state.mop && nearestDirt) {
      const result = this.dirtSpawner.applyMop(nearestDirt);
      this.actionCooldown = this.ACTION_INTERVAL;
      if (result === 'wrong_tool') {
        this.audioManager.playWrongTool();
        return 'Sweep [E] first.';
      }
      if (result === 'cleaned') {
        this.audioManager.playClean();
        this.gameState.cleanedCells += 1;
        return 'Mopped clean.';
      }
      this.audioManager.playMop();
      return 'Mopping stain...';
    }

    return currentStatus;
  }

  private async advanceDay() {
    this.isAdvancingDay = true;
    this.audioManager.playDayComplete();

    this.day += 1;
    this.gameState.day = this.day;
    this.gameState.battery = MAX_BATTERY;
    this.spawnObstaclesForDay(this.day);
    await this.spawnDirtForDay(this.day);
    this.saveProgress();
    this.isAdvancingDay = false;
  }

  private applyCameraShake(deltaTime: number) {
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - deltaTime);
      const t = this.cameraShakeTimer / 0.25;
      const amp = 0.01 * t;
      this.robot.cameraGroup.position.set((Math.random() * 2 - 1) * amp, 0, (Math.random() * 2 - 1) * amp);
    } else {
      this.robot.cameraGroup.position.set(0, 0, 0);
    }
  }

  private handleCameraAdjustments(deltaTime: number) {
    const adjustmentSpeed = 0.5;
    const currentSettings = this.robot.getCameraSettings();
    let settingsChanged = false;

    if (this.input.state.cameraUp) {
      this.robot.setCameraHeight(Math.min(0.9, currentSettings.height + adjustmentSpeed * deltaTime));
      settingsChanged = true;
    }
    if (this.input.state.cameraDown) {
      this.robot.setCameraHeight(Math.max(0.36, currentSettings.height - adjustmentSpeed * deltaTime));
      settingsChanged = true;
    }
    if (this.input.state.fovIncrease) {
      this.robot.setCameraFOV(Math.min(84, currentSettings.fov + adjustmentSpeed * deltaTime * 10));
      settingsChanged = true;
    }
    if (this.input.state.fovDecrease) {
      this.robot.setCameraFOV(Math.max(58, currentSettings.fov - adjustmentSpeed * deltaTime * 10));
      settingsChanged = true;
    }
    if (this.input.state.resetCamera) {
      this.robot.resetCameraView();
      this.input.state.resetCamera = false;
      settingsChanged = true;
    }

    this.cameraUpdateTimer += deltaTime;
    if (this.cameraUpdateTimer >= this.CAMERA_UPDATE_INTERVAL || settingsChanged) {
      this.cameraUpdateTimer = 0;
    }
  }

  private triggerGameOver(message: string) {
    this.isGameOver = true;
    this.updateHud(message);
    this.audioManager.setMovement(false);
    this.audioManager.playGameOver();

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
