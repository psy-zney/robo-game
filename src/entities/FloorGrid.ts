import * as THREE from 'three';
import { CELL_SIZE, GRID_SIZE, MUD_CLEAN_SECONDS } from '../utils/constants';

export type CellType = 'DUST' | 'MUD' | 'CLEAN';

export interface CleaningCell {
  gridX: number;
  gridZ: number;
  type: CellType;
  health: number;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  cleanTimer: number;
}

export class FloorGrid {
  public cells: CleaningCell[] = [];
  public group = new THREE.Group();
  private readonly halfSize: number;

  constructor() {
    this.halfSize = (GRID_SIZE * CELL_SIZE) / 2;
    this.group.position.set(0, 0.01, 0);
    this.createCells();
  }

  private createCells() {
    const half = this.halfSize - CELL_SIZE / 2;
    for (let x = 0; x < GRID_SIZE; x += 1) {
      for (let z = 0; z < GRID_SIZE; z += 1) {
        const worldX = -half + x * CELL_SIZE;
        const worldZ = -half + z * CELL_SIZE;
        const randomValue = Math.random();
        const state: { type: CellType; health: number } | null =
          randomValue < 0.2
            ? { type: 'MUD', health: 2 }
            : randomValue < 0.6
            ? { type: 'DUST', health: 1 }
            : null;

        const cell: CleaningCell = {
          gridX: x,
          gridZ: z,
          type: state ? state.type : 'CLEAN',
          health: state ? state.health : 0,
          mesh: this.createCellMesh(worldX, worldZ, state),
          cleanTimer: 0,
        };

        this.cells.push(cell);
        this.group.add(cell.mesh);
      }
    }
  }

  private createCellMesh(x: number, z: number, state: { type: CellType; health: number } | null) {
    const geometry = new THREE.PlaneGeometry(CELL_SIZE * 0.92, CELL_SIZE * 0.92);
    const material = this.getMaterial(state?.type ?? 'CLEAN', state?.health ?? 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.01, z);
    return mesh;
  }

  private getMaterial(type: CellType, health: number) {
    const baseColor = type === 'DUST' ? 0xffffff : type === 'MUD' ? 0x5a3b1e : 0x8bc34a;
    const opacity = type === 'MUD' && health === 1 ? 0.6 : 1;
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.9,
      metalness: 0.1,
      transparent: opacity < 1,
      opacity,
    });
  }

  public getCellAtPosition(position: THREE.Vector3) {
    const xIndex = Math.round((position.x + this.halfSize - CELL_SIZE / 2) / CELL_SIZE);
    const zIndex = Math.round((position.z + this.halfSize - CELL_SIZE / 2) / CELL_SIZE);
    if (xIndex < 0 || xIndex >= GRID_SIZE || zIndex < 0 || zIndex >= GRID_SIZE) {
      return null;
    }
    return this.cells[zIndex + xIndex * GRID_SIZE];
  }

  private removeCellMesh(cell: CleaningCell) {
    const mesh = cell.mesh;
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
    mesh.geometry.dispose();
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  }

  public cleanCell(cell: CleaningCell, deltaTime: number): string {
    if (cell.type === 'CLEAN') {
      return 'Already clean';
    }
    if (cell.type === 'DUST') {
      cell.type = 'CLEAN';
      cell.health = 0;
      cell.cleanTimer = 0;
      this.removeCellMesh(cell);
      return 'Dust cleaned in one sweep';
    }
    cell.cleanTimer += deltaTime;
    if (cell.cleanTimer >= MUD_CLEAN_SECONDS) {
      cell.cleanTimer = 0;
      cell.health -= 1;
      if (cell.health <= 0) {
        cell.type = 'CLEAN';
        this.removeCellMesh(cell);
        return 'Mud cleaned completely';
      }
      this.updateVisual(cell);
      return 'Mud scrubbed once, one more pass';
    }
    return `Scrubbing mud...`;
  }

  public updateVisual(cell: CleaningCell) {
    cell.mesh.material = this.getMaterial(cell.type, cell.health);
  }

  public getTotalCells() {
    return GRID_SIZE * GRID_SIZE;
  }

  public getCleanedCells() {
    return this.cells.filter((cell) => cell.type === 'CLEAN').length;
  }
}
