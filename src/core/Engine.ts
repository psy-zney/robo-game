import * as THREE from 'three';
import { AudioManager, sharedAudioManager } from './AudioManager';
import { assetManager } from './AssetManager';
import { createStaticBatch } from './StaticBatch';
import { InputManager } from './InputManager';
import { Husky } from '../entities/Husky';
import { Rat } from '../entities/Rat';
import { Robot } from '../entities/Robot';
import { DirtSpawner, DIRT_LABELS } from '../systems/DirtSpawner';
import { DustSpawner } from '../systems/DustSpawner';
import { GameState } from '../systems/GameState';
import { MissionSystem } from '../systems/MissionSystem';
import { NavigationGrid } from '../systems/NavigationGrid';
import { CollisionWorld } from '../systems/CollisionWorld';
import { ObstacleSpawner } from '../systems/ObstacleSpawner';
import { SaveManager } from '../systems/SaveManager';
import { getDayStory, getDifficultyMultiplier, hasSpecialEvent, type DayReport } from '../systems/StorySystem';
import { settingsStore } from '../systems/SettingsStore';
import { showDayReport } from '../ui/StoryView';
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
  ROBOT_RADIUS,
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
  private audioManager: AudioManager;
  private obstacleSpawner = new ObstacleSpawner();
  private dirtSpawner = new DirtSpawner();
  private dustSpawner: DustSpawner;

  private floorY = 0;
  private previousTime = performance.now();
  private isGameOver = false;
  private isAdvancingDay = false;
  private isReadingStory = false;
  private pendingReport?: DayReport;
  private cameraOcclusionRatio = 1;
  private bumpTimer = 0;
  private bumpDir = new THREE.Vector3();
  private cameraShakeTimer = 0;
  private day = 1;
  private dayIntroTimer = 0;
  private dayMission = '';
  private mission = new MissionSystem();
  private navigation = new NavigationGrid();
  private collisionWorld = new CollisionWorld();
  private floorWorld = new CollisionWorld();
  private isPreparingDay = false;
  private dayGeneration = 0;
  private accumulator = 0;
  private hudTimer = 0;
  private status = 'Ready';
  private needsRender = true;
  private huskyHitCooldown = 0;
  private collisionOrigin = new THREE.Vector3();
  private collisionDirection = new THREE.Vector3();
  private collisionSide = new THREE.Vector3();
  private slidePosition = new THREE.Vector3();
  private cameraOrigin = new THREE.Vector3();
  private cameraPosition = new THREE.Vector3();
  private wallHitCooldown = 0;

  private chargeStationMesh!: THREE.Mesh;
  private isCharging = false;
  private chargeSoundTimer = 0;
  private lowBatterySoundTimer = 3.5;
  private storageFullSoundTimer = 4.5;

  private actionCooldown = 0;
  private readonly ACTION_INTERVAL = 0.34;

  private huskyRandomTimer = 0;
  private readonly HUSKY_RANDOM_CHECK_INTERVAL = 5;

  private cameraUpdateTimer = 0;
  private readonly CAMERA_UPDATE_INTERVAL = 0.5;

  private currentPosition = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private movementRaycaster = new THREE.Raycaster();
  private robotSpawn = new THREE.Vector3(ROBOT_SPAWN_HINT.x, 0, ROBOT_SPAWN_HINT.z);
  private huskySpawn = new THREE.Vector3(HUSKY_SPAWN.x, 0, HUSKY_SPAWN.z);
  private chargeStationPosition = new THREE.Vector3(ROBOT_SPAWN_HINT.x, 0, ROBOT_SPAWN_HINT.z);

  private collidableMeshes: THREE.Object3D[] = [];
  private floorMeshes: THREE.Object3D[] = [];
  private ignoredEnvironmentNodes: string[] = [];
  private obstacleMeshes: THREE.Object3D[] = [];
  private playableBounds = new THREE.Box3(
    new THREE.Vector3(-3.5, 0, -3.5),
    new THREE.Vector3(3.5, 2, 3.5)
  );
  public houseBounds = new THREE.Box3();

  constructor(options?: { startDay?: number; startBattery?: number; audioManager?: AudioManager; pendingReport?: DayReport }) {
    this.audioManager = options?.audioManager ?? sharedAudioManager;
    this.scene.background = new THREE.Color(0xc3beb0);
    this.camera = this.robot.camera;
    this.audioManager.initOnUserGesture();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.setupRenderer();
    this.setupLights();

    this.day = Math.max(1, Math.floor(options?.startDay ?? 1));
    this.pendingReport = options?.pendingReport;
    this.isReadingStory = !!this.pendingReport;
    this.gameState.init(0);
    this.gameState.day = this.day;
    this.gameState.battery = Math.max(0, Math.min(MAX_BATTERY, options?.startBattery ?? MAX_BATTERY));

    this.dustSpawner = new DustSpawner(this.scene);
    if (settingsStore.get().music) this.audioManager.startMusic();
    this.setupScene();
    if (this.pendingReport) showDayReport(this.pendingReport);
    settingsStore.subscribe(settings => {
      this.robot.applySettings(settings);
      this.dirtSpawner.highlightSpot(null, settings.outlines, this.robot.group.position);
      this.needsRender = true;
      this.updateHud(this.status);
    });
    window.addEventListener('wheel', event => {
      if (!this.input.state.isLocked || this.isReadingStory || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      this.robot.zoomCamera(event.deltaY);
      this.needsRender = true;
    }, { passive: false });

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
    const ambientLight = new THREE.AmbientLight(0xf4eedf, 0.78);
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

      // Derive the playable footprint from the house floor, before considering
      // decorations. The source includes a stray window ~38km from the house.
      homeModel.updateMatrixWorld(true);
      const floorBounds = new THREE.Box3();
      homeModel.traverse(child => {
        if (/floor/i.test(child.name)) floorBounds.union(new THREE.Box3().setFromObject(child));
      });
      if (!floorBounds.isEmpty()) {
        const houseEnvelope = floorBounds.clone().expandByScalar(2);
        const outliers: THREE.Object3D[] = [];
        homeModel.traverse(child => {
          if ((child as THREE.Mesh).isMesh && !houseEnvelope.intersectsBox(new THREE.Box3().setFromObject(child))) outliers.push(child);
        });
        for (const outlier of outliers) {
          this.ignoredEnvironmentNodes.push(outlier.name);
          outlier.removeFromParent();
        }
      }

      this.floorMeshes.push(homeModel);
      this.collidableMeshes.push(homeModel);
      this.scene.add(homeModel);

      homeModel.updateMatrixWorld(true);
      if (!floorBounds.isEmpty()) this.houseBounds.copy(floorBounds);
      else this.houseBounds.setFromObject(homeModel);
      this.floorY = this.detectFloorY(homeModel);
      this.playableBounds = this.createPlayableBounds(this.houseBounds, this.floorY);
      this.floorWorld.rebuild(this.floorMeshes);
      const renderHouse = createStaticBatch(homeModel);
      homeModel.visible = false;
      this.scene.add(renderHouse);
      this.collisionWorld.rebuild(this.collidableMeshes);
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
    const nav = new NavigationGrid();
    let bestReachableCount = 0;
    const center = this.playableBounds.getCenter(new THREE.Vector3());
    const candidates = [this.robotSpawn, ...this.createSpawnGridCandidates(center).map(candidate => new THREE.Vector3(candidate.x, this.floorY, candidate.z))];
    for (const candidate of candidates) {
      const y = this.getGroundYAt(candidate.x, candidate.z, this.floorY + 1);
      if (y === undefined || !this.hasSpawnClearance(candidate.x, y, candidate.z)) continue;
      candidate.y = y;
      nav.build(candidate, this.playableBounds,
        (x, z) => this.getGroundYAt(x, z, this.floorY + 1),
        (from, to) => this.canTravel(from, to));
      if (nav.points.length > bestReachableCount) {
        bestReachableCount = nav.points.length;
        this.robotSpawn.copy(candidate);
      }
    }

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
      this.floorMeshes,
      [this.robotSpawn, this.huskySpawn, this.rat.group.position, this.robot.group.position]
    );

    for (const obs of spawnedObstacles) {
      this.scene.add(obs.mesh);
      this.collidableMeshes.push(obs.mesh);
      this.obstacleMeshes.push(obs.mesh);
    }
    this.collisionWorld.rebuild(this.collidableMeshes);
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
      color: 0x829265,
      emissive: 0x3b4530,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    });
    this.chargeStationMesh = new THREE.Mesh(geo, mat);
    this.chargeStationMesh.rotation.x = -Math.PI / 2;
    this.chargeStationMesh.position.copy(this.chargeStationPosition);
    this.scene.add(this.chargeStationMesh);
  }

  private async spawnDirtForDay(day: number) {
    const generation = ++this.dayGeneration;
    this.isPreparingDay = true;
    const nextButton = document.getElementById('next-day-btn') as HTMLButtonElement | null;
    if (nextButton) nextButton.disabled = true;
    this.mission.reset();
    this.gameState.totalCells = 0;
    this.gameState.cleanedCells = 0;
    this.gameState.emptyStorage();
    this.dustSpawner.clearAll();
    this.actionCooldown = 0;
    this.updateHud('Preparing room...');
    const story = getDayStory(day);
    this.dayMission = story.mission;
    this.dayIntroTimer = 3.5;

    if (hasSpecialEvent(day, 'reduced_battery')) {
      this.gameState.battery = Math.min(this.gameState.battery, MAX_BATTERY * 0.7);
    }
    try {
      this.navigation.build(this.robotSpawn, this.playableBounds,
        (x, z) => this.getGroundYAt(x, z, this.floorY + 1),
        (from, to) => this.canTravel(from, to));
      await this.dirtSpawner.spawnForDay(day, this.floorY, this.floorMeshes, story.dirtWeights, this.playableBounds, this.navigation.points, this.chargeStationPosition);
      if (generation !== this.dayGeneration) return;
      const dustPoints = this.navigation.points.filter(point => point.distanceTo(this.chargeStationPosition) > CHARGE_RADIUS + 0.15);
      this.dustSpawner.spawnForDay(day, this.floorY, story.dustColor, this.playableBounds, dustPoints);
      this.gameState.totalCells = this.dirtSpawner.getTotalCount();
      this.mission.begin(this.gameState.totalCells, this.dustSpawner.getTotalCount());
      this.isPreparingDay = false;
      if (nextButton) nextButton.disabled = false;
      this.needsRender = true;
      if (this.mission.phase === 'loading') {
        this.triggerGameOver('No reachable cleaning area. Restart the day to rebuild the room.');
        return;
      }
      this.saveProgress();
      const facingPoint = this.navigation.points.reduce((best, point) => point.distanceToSquared(this.robotSpawn) > best.distanceToSquared(this.robotSpawn) ? point : best, this.robotSpawn);
      this.robot.cameraGroup.rotation.y = Math.atan2(this.robotSpawn.x - facingPoint.x, this.robotSpawn.z - facingPoint.z);
      this.updateHud('Ready');
      this.uiManager.updateActionPrompt(false, false);
    } catch (error) {
      if (generation !== this.dayGeneration) return;
      this.isPreparingDay = false;
      if (nextButton) nextButton.disabled = false;
      console.error('Could not prepare day:', error);
      this.triggerGameOver('Room preparation failed. Restart the day.');
    }
  }

  private saveProgress(completedDay?: number) {
    const existing = SaveManager.load();
    const highestDay = Math.max(existing?.highestDay ?? 1, this.day);
    SaveManager.save({
      battery: this.gameState.battery,
      cleanedCount: this.gameState.cleanedCells,
      day: this.day,
      money: this.gameState.money,
      highestDay,
      version: '1.0.0',
      timestamp: Date.now(),
      playtime: 0,
      completedDays: [...new Set([...(existing?.completedDays ?? []), ...(completedDay === undefined ? [] : [completedDay])])],
      pendingReport: this.pendingReport,
    });
  }

  public restartDay() {
    if (this.isAdvancingDay) return;
    this.isGameOver = false;
    this.isReadingStory = false;
    this.pendingReport = undefined;
    document.getElementById('story-screen')?.classList.remove('active');
    document.getElementById('game-over-screen')?.classList.remove('active');
    this.input.reset();
    this.bumpTimer = this.cameraShakeTimer = this.huskyHitCooldown = this.wallHitCooldown = 0;
    this.huskyRandomTimer = 0;
    this.accumulator = 0;
    this.robot.cameraGroup.position.set(0, 0, 0);
    this.gameState.battery = MAX_BATTERY;
    this.robot.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
    this.husky.spawn(this.huskySpawn.x, this.huskySpawn.y, this.huskySpawn.z);
    this.husky.setBounds(this.playableBounds);
    this.rat.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z + 0.4);
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

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }

  public resetCamera() {
    const yaw = this.robot.cameraGroup.rotation.y;
    this.robot.resetCameraView();
    this.robot.cameraGroup.rotation.y = yaw;
    this.cameraOcclusionRatio = 1;
    this.needsRender = true;
    this.updateHud(this.status);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.needsRender = true;
  };

  private updateHud(status: string) {
    const story = getDayStory(this.day);
    const difficultyMultiplier = getDifficultyMultiplier(this.day);
    const cameraSettings = this.robot.getCameraSettings();
    const cameraSettingsText = `Cuộn: zoom · C: đổi cam · ${cameraSettings.fov.toFixed(0)}°`;

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
    this.uiManager.updateObjectives(this.mission.objectiveText);
    const dx = this.chargeStationPosition.x - this.robot.group.position.x;
    const dz = this.chargeStationPosition.z - this.robot.group.position.z;
    this.uiManager.updateDockHint(Math.hypot(dx, dz), Math.atan2(dx, -dz) + this.robot.cameraGroup.rotation.y);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const currentTime = performance.now();
    const elapsed = Math.min(0.1, (currentTime - this.previousTime) / 1000);
    this.previousTime = currentTime;
    const pauseScreen = document.getElementById('pause-screen');
    const dialogOpen = !!document.querySelector('dialog[open]');
    const paused = !this.input.state.isLocked || dialogOpen || this.isReadingStory;
    const showPause = paused && !this.isGameOver && !this.isReadingStory && !dialogOpen && !this.isPreparingDay && !this.isAdvancingDay;
    const wasPaused = pauseScreen?.classList.contains('active');
    pauseScreen?.classList.toggle('active', showPause);
    if (showPause && !wasPaused) document.getElementById('resume-btn')?.focus({ preventScroll: true });
    const hud = document.getElementById('game-ui');
    if (hud) hud.inert = paused || this.isGameOver || this.isPreparingDay || this.isAdvancingDay;
    if (paused || this.isGameOver || this.isPreparingDay || this.isAdvancingDay) {
      this.accumulator = 0;
      this.robot.stopMovement();
      this.audioManager.setMovement(false);
      if (this.needsRender) {
        this.updateCameraOcclusion();
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
      }
      return;
    }
    this.accumulator += elapsed;
    this.needsRender = true;
    const step = 1 / 60;
    while (this.accumulator >= step) {
      this.status = this.updateGame(step, currentTime);
      this.accumulator -= step;
      if (this.isGameOver || this.isPreparingDay || this.isAdvancingDay || this.isReadingStory) {
        this.accumulator = 0;
        break;
      }
    }
    this.hudTimer += elapsed;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.updateHud(this.status);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private updateGame(deltaTime: number, currentTime: number): string {
    if (this.isReadingStory || this.isGameOver || document.querySelector('dialog[open]')) return this.status;
    this.wallHitCooldown = Math.max(0, this.wallHitCooldown - deltaTime);
    this.huskyHitCooldown = Math.max(0, this.huskyHitCooldown - deltaTime);
    const isPlayerInputMoving = this.input.state.forward || this.input.state.backward || this.input.state.left || this.input.state.right;
    const isCleaning = this.input.state.suction || this.input.state.mop;

    this.handleCameraAdjustments(deltaTime);
    this.robot.getPosition(this.currentPosition);

    this.husky.update(
      deltaTime,
      (origin, dir, dist) => {
        this.raycaster.set(origin, dir);
        const intersects = this.raycaster.intersectObjects(this.collisionWorld.along(origin, dir, dist), false);
        return intersects.length > 0 && intersects[0].distance < dist;
      },
      (from, to) => {
        const dir = new THREE.Vector3().subVectors(to, from).normalize();
        const dist = from.distanceTo(to);
        this.raycaster.set(from, dir);
        const intersects = this.raycaster.intersectObjects(this.collisionWorld.along(from, dir, dist), false);
        return intersects.length > 0 && intersects[0].distance < dist;
      },
      this.currentPosition,
      isPlayerInputMoving,
      isCleaning,
      (x, z, fromY) => this.getGroundYAt(x, z, fromY)
    );

    this.rat.update(deltaTime, (from, to) => this.canTravel(from, to, 0.06), (x, z) => this.getGroundYAt(x, z, this.floorY + 1));
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
    const isMoving = this.currentPosition.distanceToSquared(targetPosition) > 1e-8;
    let hitWall = this.checkMovementCollision(targetPosition, isMoving);
    if (hitWall && isMoving) {
      this.slidePosition.set(targetPosition.x, this.currentPosition.y, this.currentPosition.z);
      if (this.slidePosition.distanceToSquared(this.currentPosition) > 1e-8 && this.canTravel(this.currentPosition, this.slidePosition)) {
        targetPosition.copy(this.slidePosition);
        hitWall = false;
      } else {
        this.slidePosition.set(this.currentPosition.x, this.currentPosition.y, targetPosition.z);
        if (this.slidePosition.distanceToSquared(this.currentPosition) > 1e-8 && this.canTravel(this.currentPosition, this.slidePosition)) {
          targetPosition.copy(this.slidePosition);
          hitWall = false;
        }
      }
    }
    let hitHusky = false;

    const huskyPos = this.husky.group.position;
    const currentHuskyDist = this.currentPosition.distanceTo(huskyPos);
    const targetHuskyDist = targetPosition.distanceTo(huskyPos);
    const huskyDist = Math.min(currentHuskyDist, targetHuskyDist);
    if (huskyDist < 0.30) {
      hitHusky = targetHuskyDist < 0.30 && targetHuskyDist <= currentHuskyDist + 1e-6;
      if (hitHusky) hitWall = true;
      if (this.huskyHitCooldown <= 0 && this.currentPosition.distanceTo(this.chargeStationPosition) > CHARGE_RADIUS) {
        this.huskyHitCooldown = 1.5;
        this.gameState.battery = Math.max(0, this.gameState.battery - 10);
        this.bumpTimer = 0.28;
        this.cameraShakeTimer = 0.25;
        this.bumpDir.copy(this.currentPosition).sub(huskyPos).setY(0);
        if (this.bumpDir.lengthSq() < 1e-6) this.bumpDir.set(0, 0, 1);
        else this.bumpDir.normalize();
        if (this.husky.state === 'chase' || Math.random() >= HUSKY_BARK_CHANCE) this.audioManager.playBite();
        else this.audioManager.playBark();
        this.audioManager.playHuskyCollision();
        this.husky.onContact();
      }
    }

    if (this.bumpTimer > 0) {
      this.bumpTimer = Math.max(0, this.bumpTimer - deltaTime);
      this.slidePosition.copy(this.currentPosition).addScaledVector(this.bumpDir, 0.9 * deltaTime);
      if (this.canTravel(this.currentPosition, this.slidePosition)) this.robot.group.position.copy(this.slidePosition);
      this.robot.stopMovement();
    } else if (!hitWall && isMoving && this.gameState.battery > 0) {
      this.robot.group.position.copy(targetPosition);
      this.robot.group.position.y = this.getGroundYAt(targetPosition.x, targetPosition.z, this.floorY + 1) ?? this.floorY;
    } else if (hitWall) this.robot.stopMovement();
    const actualSpeed = this.robot.group.position.distanceTo(this.currentPosition) / deltaTime;
    const actuallyMoving = actualSpeed > 0.02;
    this.audioManager.setMovement(actuallyMoving && this.bumpTimer <= 0);
    this.robot.getPosition(this.currentPosition);

    const distToCharger = Math.hypot(
      this.currentPosition.x - this.chargeStationPosition.x,
      this.currentPosition.z - this.chargeStationPosition.z
    );
    const docked = distToCharger < CHARGE_RADIUS && !actuallyMoving && !isCleaning && this.bumpTimer <= 0;
    this.isCharging = docked && this.gameState.battery < MAX_BATTERY;
    if (docked) this.gameState.emptyStorage();

    if (this.isCharging) {
      const prevBattery = this.gameState.battery;
      this.gameState.battery = Math.min(MAX_BATTERY, this.gameState.battery + CHARGE_RATE * deltaTime);
      if (prevBattery < MAX_BATTERY && this.gameState.battery >= MAX_BATTERY) {
        this.audioManager.playBatteryFull();
      }
      this.chargeSoundTimer += deltaTime;
      if (this.chargeSoundTimer >= 1.5) {
        this.chargeSoundTimer = 0;
        this.audioManager.playCharge();
      }
      const pulse = settingsStore.get().reducedMotion ? .48 : .46 + Math.sin(currentTime * 0.003) * .07;
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
    } else if (actuallyMoving) {
      drainRate = BATTERY_DRAIN_MOVE;
      status = 'Moving...';
    }

    if (drainRate > 0) {
      this.gameState.battery = Math.max(0, this.gameState.battery - drainRate * deltaTime);
    }

    if (this.gameState.battery <= 0 && !this.isCharging) {
      this.triggerGameOver('Out of battery. Robot failed to return to base.');
      return 'Out of battery.';
    }

    if (this.bumpTimer <= 0) status = this.handleCleaning(deltaTime, status);
    else status = 'Recovering...';
    this.mission.update(this.gameState.cleanedCells, this.dustSpawner.getTotalCount() - this.dustSpawner.getActiveCount(), docked);

    if (!this.isAdvancingDay && this.mission.phase === 'complete') {
      status = 'Ca dọn hoàn thành · Nhật ký đã mở.';
      this.completeDay();
    }

    if (hitWall && isMoving && this.bumpTimer <= 0) {
      status = hitHusky ? 'Husky in the way!' : 'Obstacle detected.';
      if (!hitHusky && this.wallHitCooldown <= 0) {
        this.audioManager.playWallHit();
        this.wallHitCooldown = 0.45;
      }
    }
    if (this.gameState.isStorageFull() && !docked) {
      status = 'Storage full. Return to the green dock.';
      this.storageFullSoundTimer += deltaTime;
      if (this.storageFullSoundTimer >= 4.5) {
        this.storageFullSoundTimer = 0;
        this.audioManager.playStorageFull();
      }
    } else {
      this.storageFullSoundTimer = 4.0;
    }

    if (this.mission.phase === 'returning') {
      status = 'Room clean. Return to the green dock.';
    } else if (this.gameState.battery < 20 && !this.isCharging && !isCleaning) {
      status = 'Low battery. Return to the green dock.';
      this.lowBatterySoundTimer += deltaTime;
      if (this.lowBatterySoundTimer >= 4.0) {
        this.lowBatterySoundTimer = 0;
        this.audioManager.playBatteryLow();
      }
    } else {
      this.lowBatterySoundTimer = 3.5;
    }
    this.robot.animate(deltaTime, actualSpeed, this.bumpTimer > 0 ? null : this.input.state.suction ? 'sweep' : this.input.state.mop ? 'mop' : null);
    this.applyCameraShake(deltaTime);
    this.updateCameraOcclusion();
    return status;
  }

  private updateCameraOcclusion() {
    this.robot.resetCameraBoomDistance();
    const desiredCameraPosition = this.camera.getWorldPosition(this.cameraPosition);
    const origin = this.cameraOrigin.copy(this.robot.group.position);
    origin.y += 0.18;

    const toCamera = desiredCameraPosition.sub(origin);
    const desiredDistance = toCamera.length();
    if (desiredDistance <= 0.1) {
      this.robot.resetCameraBoomDistance();
      return;
    }

    this.raycaster.set(origin, toCamera.normalize());
    const hits = this.raycaster.intersectObjects(this.collisionWorld.along(origin, toCamera, desiredDistance), false);
    const blockingHit = hits.find((hit) => hit.distance > 0.08 && hit.distance < desiredDistance - 0.05);

    const safeRatio = blockingHit ? Math.max(0.08, (blockingHit.distance - 0.08) / desiredDistance) : 1;
    // Pull inward immediately to avoid clipping; ease outward when space clears.
    this.cameraOcclusionRatio = safeRatio < this.cameraOcclusionRatio ? safeRatio : THREE.MathUtils.damp(this.cameraOcclusionRatio, safeRatio, 7, 1 / 60);
    this.robot.setCameraBoomDistance(this.robot.getDefaultCameraBoomDistance() * this.cameraOcclusionRatio);
  }

  private getGroundYAt(x: number, z: number, fromY: number): number | undefined {
    if (!this.floorMeshes.length) return undefined;

    this.raycaster.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    const hits = this.raycaster.intersectObjects(this.floorWorld.at(x, z), false);
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
    return !this.canTravel(this.currentPosition, targetPosition);
  }

  private canTravel(from: THREE.Vector3, to: THREE.Vector3, radius = ROBOT_RADIUS): boolean {
    if (to.x < this.playableBounds.min.x + radius || to.x > this.playableBounds.max.x - radius || to.z < this.playableBounds.min.z + radius || to.z > this.playableBounds.max.z - radius) return false;
    if (this.floorMeshes.length && this.getGroundYAt(to.x, to.z, this.floorY + 1) === undefined) return false;
    this.collisionDirection.subVectors(to, from).setY(0);
    const distance = this.collisionDirection.length();
    if (distance < 1e-6) return true;
    this.collisionDirection.divideScalar(distance);
    this.collisionSide.set(-this.collisionDirection.z, 0, this.collisionDirection.x);
    this.movementRaycaster.far = distance + radius;
    for (const height of [0.065, 0.13]) {
      for (const offset of [-radius, 0, radius]) {
        this.collisionOrigin.copy(from).addScaledVector(this.collisionSide, offset);
        this.collisionOrigin.y += height;
        this.movementRaycaster.set(this.collisionOrigin, this.collisionDirection);
        if (this.movementRaycaster.intersectObjects(this.collisionWorld.along(this.collisionOrigin, this.collisionDirection, distance + radius), false).length) return false;
      }
    }
    return true;
  }

  private canInteract(point: THREE.Vector3): boolean {
    this.collisionOrigin.copy(this.currentPosition);
    this.collisionOrigin.y += 0.1;
    this.collisionDirection.set(point.x - this.currentPosition.x, 0, point.z - this.currentPosition.z);
    const distance = this.collisionDirection.length();
    if (distance < 0.01) return true;
    this.collisionDirection.divideScalar(distance);
    this.movementRaycaster.far = distance;
    this.movementRaycaster.set(this.collisionOrigin, this.collisionDirection);
    return this.movementRaycaster.intersectObjects(this.collisionWorld.along(this.collisionOrigin, this.collisionDirection, distance), false).length === 0;
  }

  private handleCleaning(deltaTime: number, currentStatus: string): string {
    this.actionCooldown = Math.max(0, this.actionCooldown - deltaTime);
    const isSweeping = this.input.state.suction;
    const step = isSweeping ? 'needs_sweep' : this.input.state.mop ? 'needs_mop' : undefined;
    const canInteract = (spot: { mesh: THREE.Mesh }) => this.canInteract(spot.mesh.position);
    const nearestDirt = this.dirtSpawner.findNearestSpot(this.currentPosition, canInteract, step)
      ?? this.dirtSpawner.findNearestSpot(this.currentPosition, canInteract);
    const hint = nearestDirt ? `${DIRT_LABELS[nearestDirt.config.name] ?? nearestDirt.config.name} · Giữ ${nearestDirt.currentStep === 'needs_sweep' ? 'E hút' : 'R lau'} · ${nearestDirt.remainingActions} lượt` : undefined;
    this.dirtSpawner.highlightSpot(nearestDirt, settingsStore.get().outlines, this.currentPosition);
    this.uiManager.updateTargetProgress(nearestDirt ? 1 - nearestDirt.remainingActions / nearestDirt.config.requiredActions : 0);
    this.uiManager.updateActionPrompt(isSweeping, this.input.state.mop, this.gameState.isStorageFull() && !this.input.state.mop ? 'Hộp đầy · Về trạm đổ bụi' : this.mission.phase === 'returning' ? 'Nhà sạch · Về trạm hoàn thành ca' : hint);

    if (this.actionCooldown > 0) return currentStatus;
    if (isSweeping && this.gameState.isStorageFull()) return 'Storage full. Return to the green dock.';

    const collected = this.dustSpawner.checkCollision(this.currentPosition, isSweeping, this.gameState.storageCapacity - this.gameState.storage, point => this.canInteract(point));
    if (collected > 0) {
      this.gameState.storage += collected;
      this.audioManager.playCollectItem();
      this.actionCooldown = this.ACTION_INTERVAL;
      currentStatus = 'Dust collected.';
    }

    if (isSweeping && nearestDirt && !this.gameState.isStorageFull()) {
      const result = this.dirtSpawner.applySweep(nearestDirt);
      this.actionCooldown = this.ACTION_INTERVAL;
      if (result === 'wrong_tool') {
        this.audioManager.playWrongTool();
        return 'Needs mop [R].';
      }
      this.gameState.collectItem();
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

  private completeDay() {
    if (this.isReadingStory) return;
    this.isReadingStory = true;
    this.pendingReport = { day: this.day, stains: this.mission.spots, dust: this.mission.dust, battery: this.gameState.battery };
    this.audioManager.playDayComplete();
    this.audioManager.setMovement(false);
    this.input.reset();
    this.robot.stopMovement();
    if (document.pointerLockElement) document.exitPointerLock();
    this.saveProgress(this.day);
    this.updateHud('Ca dọn hoàn thành · Nhật ký đã mở.');
    showDayReport(this.pendingReport);
  }

  public async nextDay() {
    if (!this.isReadingStory || this.isAdvancingDay || this.isPreparingDay) return;
    this.isAdvancingDay = true;
    this.isReadingStory = false;
    this.pendingReport = undefined;
    document.getElementById('story-screen')?.classList.remove('active');
    this.day += 1;
    this.gameState.day = this.day;
    this.gameState.battery = MAX_BATTERY;
    this.bumpTimer = this.cameraShakeTimer = this.huskyHitCooldown = this.huskyRandomTimer = 0;
    this.input.reset();
    this.robot.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
    this.husky.spawn(this.huskySpawn.x, this.huskySpawn.y, this.huskySpawn.z);
    this.husky.setBounds(this.playableBounds);
    this.rat.spawn(this.robotSpawn.x, this.robotSpawn.y, this.robotSpawn.z);
    this.spawnObstaclesForDay(this.day);
    await this.spawnDirtForDay(this.day);
    this.isAdvancingDay = false;
  }

  private applyCameraShake(deltaTime: number) {
    if (settingsStore.get().reducedMotion) {
      this.cameraShakeTimer = 0;
      this.robot.cameraGroup.position.set(0, 0, 0);
      return;
    }
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
      reasonText.innerText = message === 'Out of battery!' || /battery/i.test(message) ? 'Pin đã cạn trước khi về trạm. Ca dọn có thể bắt đầu lại.' : 'Ca dọn bị gián đoạn. Thử chuẩn bị lại căn nhà.';
      gameOverScreen.classList.add('active');
      document.getElementById('pause-screen')?.classList.remove('active');
      restartBtn.onclick = () => this.restartDay();
    }
  }
}
