import * as THREE from 'three';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { Robot } from '../entities/Robot';
import { FloorGrid } from '../entities/FloorGrid';
import { Physics } from '../systems/Physics';
import { GameState } from '../systems/GameState';
import { ObstacleSpawner, type SpawnedObstacle } from '../systems/ObstacleSpawner';
import { UIManager } from '../ui/UIManager';
import { assetManager } from './AssetManager';
import { Husky } from '../entities/Husky';
import { HOUSE_RECHARGE_RATE, MOVE_SPEED, ROBOT_RADIUS } from '../utils/constants';

export class Engine {
  private scene = new THREE.Scene();
  private houseZone = new THREE.Box3();
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private camera: THREE.PerspectiveCamera;
  private input = new InputManager();
  private robot = new Robot();
  private floorGrid = new FloorGrid();
  private obstacleSpawner = new ObstacleSpawner();
  private obstacles: SpawnedObstacle[] = [];
  private gameState = new GameState();
  private uiManager = new UIManager();
  private husky = new Husky();
  private previousTime = performance.now();
  private isGameOver = false;
  private bumpTimer = 0;
  private audioManager = new AudioManager();
  private currentPosition = new THREE.Vector3();
  private currentBox = new THREE.Box3();
  private targetBox = new THREE.Box3();
  private pushDirection = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private rayOrigin = new THREE.Vector3();
  private rayDir = new THREE.Vector3();
  private collidableMeshes: THREE.Object3D[] = [];

  constructor() {
    this.scene.background = new THREE.Color(0x87ceeb);
    this.camera = this.robot.camera;
    this.audioManager.initOnUserGesture();
    this.setupRenderer();
    this.setupLights();
    this.setupScene();
    this.gameState.init(this.floorGrid.getTotalCells());
    this.setupObstacles();
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 15);
    this.scene.add(dirLight);
  }

  public houseBounds = new THREE.Box3();

  private setupScene() {
    const houseModel = assetManager.getModel('house');
    if (houseModel) {
      const box = new THREE.Box3().setFromObject(houseModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      // Disable auto-scaling block from previous buggy iterations - Bỏ đoạn tự động scale lỗi: để scale cố định
      houseModel.scale.setScalar(4.0);

      // Reset center of mass - Reset tâm để căn giữa map
      houseModel.updateMatrixWorld(true);
      const newBox = new THREE.Box3().setFromObject(houseModel);
      const center = newBox.getCenter(new THREE.Vector3());
      houseModel.position.sub(center);

      // Calculate logic floor - Tính toán mặt đáy chính xác
      // Align bottom-most point to y=0 - Thay vì dịch tay, ta lấy đúng điểm thấp nhất của house làm y=0
      houseModel.updateMatrixWorld(true);
      const finalBox = new THREE.Box3().setFromObject(houseModel);
      houseModel.position.y -= finalBox.min.y;

      houseModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const childMesh = child as THREE.Mesh;
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });
      this.collidableMeshes.push(houseModel);
      this.scene.add(houseModel);

      houseModel.updateMatrixWorld(true);
      this.houseBounds.setFromObject(houseModel);
    }

    const doorModel = assetManager.getModel('door');
    if (doorModel) {
      doorModel.position.set(-15.63, 0, 23.37);
      doorModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const childMesh = child as THREE.Mesh;
          childMesh.castShadow = true;
          childMesh.receiveShadow = true;
        }
      });
      this.collidableMeshes.push(doorModel);
      this.scene.add(doorModel);
    }

    // Tắt các khối vuông / lưới gỡ lỗi
    // const gridHelper = new THREE.GridHelper(FLOOR_SIZE, GRID_SIZE, 0x444444, 0x888888);
    // this.scene.add(gridHelper);
    // this.scene.add(this.floorGrid.group);

    // Turn off old charging house placeholders - Tắt khối nhà sạc cũ
    this.setupHouse();

    // Robot always starts from specific coordinates - Robot luôn xuất phát từ center ở độ cao chuẩn
    this.robot.group.position.set(0, 1.5, 0);
    this.scene.add(this.robot.group);
    this.scene.add(this.husky.group);

    // Setup reset button logic - Cài đặt logic nút Reset trên màn hình
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.robot.group.position.set(0, 1.5, 0);
        this.robot.group.rotation.set(0, 0, 0);
        this.husky.group.position.set(0.77, 1.5, -47.9);
        this.isGameOver = false; // Clear GAME OVER state - Xóa trạng thái gameOver
        this.updateHud('Game reset! Positions normalized.');
      });
    }
  }

  private setupHouse() {
    this.houseZone.set(
      new THREE.Vector3(-3, 0, -3),
      new THREE.Vector3(3, 0.5, 3)
    );
  }

  private setupObstacles() {
    this.obstacles = this.obstacleSpawner.generateDailyRoom(this.gameState.day);
    this.obstacles.forEach((obstacle) => this.scene.add(obstacle.mesh));
  }



  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateHud(status: string) {
    const pos = `${this.currentPosition.x.toFixed(2)}, ${this.currentPosition.y.toFixed(2)}, ${this.currentPosition.z.toFixed(2)}`;
    this.uiManager.update(
      pos,
      this.gameState.battery,
      this.gameState.cleanedCells,
      this.gameState.totalCells,
      this.gameState.storage,
      this.gameState.storageCapacity,
      status
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

    this.husky.update(deltaTime);

    this.robot.getPosition(this.currentPosition);
    const targetPosition = this.robot.update(deltaTime, this.input.state, MOVE_SPEED);
    this.robot.getBoundingBox(this.currentPosition, this.currentBox);
    this.robot.getBoundingBox(targetPosition, this.targetBox);
    const isOutOfBounds = !this.houseBounds.isEmpty() && !this.houseBounds.containsBox(this.targetBox);
    const movingForwardOrBack = this.input.state.forward || this.input.state.backward;

    let hitWall = false;
    if (!this.currentPosition.equals(targetPosition) && movingForwardOrBack) {
      this.rayDir.copy(targetPosition).sub(this.currentPosition);
      const dist = this.rayDir.length();
      if (dist > 0) {
        this.rayDir.normalize();
        
        // Cast 3 rays to ensure Roomba doesn't slip through thin walls - 3 tia để đảm bảo Roomba không lọt qua tường mỏng hoặc góc hẹp
        const leftOffset = new THREE.Vector3(-this.rayDir.z, 0, this.rayDir.x).multiplyScalar(ROBOT_RADIUS * 0.8);
        const rightOffset = new THREE.Vector3(this.rayDir.z, 0, -this.rayDir.x).multiplyScalar(ROBOT_RADIUS * 0.8);

        const origins = [
          this.currentPosition.clone(),
          this.currentPosition.clone().add(leftOffset),
          this.currentPosition.clone().add(rightOffset)
        ];

        for (const origin of origins) {
          // Raise origin point slightly to avoid floor bumps - Nâng điểm quét tia để quét sát bề mặt vật thể an toàn
          origin.y += 0.2; 
          this.raycaster.set(origin, this.rayDir);
          const intersects = this.raycaster.intersectObjects(this.collidableMeshes, true);
          if (intersects.length > 0 && intersects[0].distance < dist + ROBOT_RADIUS) {
            hitWall = true;
            break; // Stop immediately upon first collision - Trúng 1 tia là cản lại ngay lập tức
          }
        }
      }
    }

    const collides = Physics.checkCollision(targetPosition, this.currentBox, this.obstacles) || isOutOfBounds || hitWall;
    const inHouse = this.houseZone.intersectsBox(this.targetBox);

    const huskyBox = this.husky.getBoundingBox();
    if (huskyBox.intersectsBox(this.targetBox) || huskyBox.intersectsBox(this.currentBox)) {
      this.husky.attack(this.currentPosition);
      this.triggerGameOver('Husky attacked! Game Over!');
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (inHouse) {
      if (!collides && this.gameState.canMove()) {
        this.robot.group.position.copy(targetPosition);
      }
      this.gameState.rechargeBattery(deltaTime, HOUSE_RECHARGE_RATE);
      this.audioManager.setMovement(movingForwardOrBack && this.gameState.canMove());
      if (this.gameState.storage > 0) {
        this.gameState.emptyStorage();
        this.updateHud('Home: storage emptied and recharging');
      } else {
        this.updateHud('Recharging at home');
      }
    } else if (this.bumpTimer > 0) {
      this.bumpTimer = Math.max(0, this.bumpTimer - deltaTime);
      this.updateHud('Recovering from bump');
    } else if (collides && movingForwardOrBack && this.gameState.canMove()) {
      this.pushDirection.copy(this.currentPosition).sub(targetPosition).setY(0);
      if (this.pushDirection.lengthSq() > 0) {
        this.pushDirection.normalize();
        this.robot.group.position.addScaledVector(this.pushDirection, 0.25);
      }
      this.audioManager.setMovement(false);
      this.bumpTimer = 0.3;
      this.updateHud('Bumped back from obstacle');
      this.audioManager.playBump();
    } else {
      const moving = !collides && movingForwardOrBack && this.gameState.canMove();
      if (moving) {
        this.robot.group.position.copy(targetPosition);
      }
      this.gameState.drainBattery(deltaTime, moving);
      this.audioManager.setMovement(moving);
      this.updateCleaning(deltaTime);
      if (!this.gameState.canMove()) {
        this.updateHud('Battery drained – movement disabled');
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateCleaning(deltaTime: number) {
    const worldPosition = this.robot.getPosition(this.currentPosition);
    const cell = this.floorGrid.getCellAtPosition(worldPosition);
    if (!cell) {
      this.updateHud('Moving on clean floor');
      return;
    }
    if (cell.type === 'CLEAN') {
      this.updateHud('Already cleaned');
      return;
    }
    const status = this.floorGrid.cleanCell(cell, deltaTime);
    if (status.includes('cleaned')) {
      this.gameState.incrementCleaned();
      this.audioManager.playClean();
    }
    this.updateHud(status);
  }

  private triggerGameOver(message: string) {
    this.isGameOver = true;
    this.updateHud(message);
    this.robot.group.rotation.x = Math.PI;
    this.robot.group.position.y += 0.3;

    this.audioManager.setMovement(false);

    const ui = document.createElement('div');
    ui.style.position = 'absolute';
    ui.style.top = '50%';
    ui.style.left = '50%';
    ui.style.transform = 'translate(-50%, -50%)';
    ui.style.color = '#ff4444';
    ui.style.fontSize = '48px';
    ui.style.fontWeight = 'bold';
    ui.style.fontFamily = 'monospace, sans-serif';
    ui.style.textShadow = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';
    ui.innerText = 'GAME OVER\nHusky Attacked!';
    ui.style.textAlign = 'center';
    ui.style.zIndex = '1000';
    ui.style.pointerEvents = 'auto';

    const btn = document.createElement('button');
    btn.innerText = 'Play Again';
    btn.style.marginTop = '20px';
    btn.style.padding = '15px 30px';
    btn.style.fontSize = '24px';
    btn.style.background = '#ff4444';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.onclick = () => window.location.reload();

    ui.appendChild(document.createElement('br'));
    ui.appendChild(btn);

    document.body.appendChild(ui);
  }
}
