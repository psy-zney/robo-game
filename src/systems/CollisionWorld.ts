import * as THREE from 'three';

/** Static mesh buckets keep short floor/collision rays local to the robot. */
export class CollisionWorld {
  private buckets = new Map<string, THREE.Object3D[]>();
  private readonly cellSize = 0.75;

  public rebuild(objects: THREE.Object3D[]) {
    this.buckets.clear();
    for (const object of objects) {
      object.updateMatrixWorld(true);
      object.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox?.clone().applyMatrix4(mesh.matrixWorld);
        if (!bounds || bounds.isEmpty()) return;
        const minX = Math.floor(bounds.min.x / this.cellSize);
        const maxX = Math.floor(bounds.max.x / this.cellSize);
        const minZ = Math.floor(bounds.min.z / this.cellSize);
        const maxZ = Math.floor(bounds.max.z / this.cellSize);
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            const key = `${x},${z}`;
            const bucket = this.buckets.get(key) ?? [];
            bucket.push(mesh);
            this.buckets.set(key, bucket);
          }
        }
      });
    }
  }

  public at(x: number, z: number): THREE.Object3D[] {
    return this.buckets.get(`${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`) ?? [];
  }

  public along(origin: THREE.Vector3, direction: THREE.Vector3, distance: number): THREE.Object3D[] {
    const endX = origin.x + direction.x * distance;
    const endZ = origin.z + direction.z * distance;
    const minX = Math.floor(Math.min(origin.x, endX) / this.cellSize);
    const maxX = Math.floor(Math.max(origin.x, endX) / this.cellSize);
    const minZ = Math.floor(Math.min(origin.z, endZ) / this.cellSize);
    const maxZ = Math.floor(Math.max(origin.z, endZ) / this.cellSize);
    if (minX === maxX && minZ === maxZ) return this.at(origin.x, origin.z);
    const found = new Set<THREE.Object3D>();
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (const mesh of this.buckets.get(`${x},${z}`) ?? []) found.add(mesh);
      }
    }
    return [...found];
  }
}
