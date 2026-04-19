import * as THREE from 'three';

export class Physics {
  private static tempVector = new THREE.Vector3();
  private static tempBox = new THREE.Box3();
  private static tempCenter = new THREE.Vector3();

  public static checkCollision(targetPosition: THREE.Vector3, robotBox: THREE.Box3, obstacles: { bounds: THREE.Box3 }[]) {
    const center = robotBox.getCenter(this.tempCenter);
    const offset = this.tempVector.copy(targetPosition).sub(center);
    const projectedBox = this.tempBox.copy(robotBox).translate(offset);
    return obstacles.some((obstacle) => obstacle.bounds.intersectsBox(projectedBox));
  }

  public static createRobotBox(center: THREE.Vector3, size: number) {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(center.x, size / 2, center.z),
      new THREE.Vector3(size, size, size)
    );
  }
}
