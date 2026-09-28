import * as THREE from 'three';

/** Flood fill from the dock; mess only appears on floor the robot can reach. */
export class NavigationGrid {
  public points: THREE.Vector3[] = [];
  public readonly spacing = 0.34;

  public build(
    origin: THREE.Vector3,
    bounds: THREE.Box3,
    getGround: (x: number, z: number) => number | undefined,
    canTravel: (from: THREE.Vector3, to: THREE.Vector3) => boolean,
  ) {
    this.points = [origin.clone()];
    const visited = new Set(['0,0']);
    const queue = [{ x: 0, z: 0, point: this.points[0] }];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      for (const [dx, dz] of directions) {
        const ix = current.x + dx;
        const iz = current.z + dz;
        const key = `${ix},${iz}`;
        if (visited.has(key)) continue;
        const x = origin.x + ix * this.spacing;
        const z = origin.z + iz * this.spacing;
        if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) continue;
        const y = getGround(x, z);
        if (y === undefined) {
          visited.add(key);
          continue;
        }
        const point = new THREE.Vector3(x, y, z);
        // A blocked edge is not a blocked node: it may be reached from another side.
        if (!canTravel(current.point, point)) continue;
        visited.add(key);
        this.points.push(point);
        queue.push({ x: ix, z: iz, point });
      }
    }
  }
}
