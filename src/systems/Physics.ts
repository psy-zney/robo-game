import * as THREE from 'three';

/**
 * Physics - Static utility class for collision detection and physics calculations
 * Physics - Lớp tiện ích tĩnh cho phát hiện va chạm và tính toán vật lý
 */
export class Physics {
  private static tempVector = new THREE.Vector3();
  private static tempBox = new THREE.Box3();
  private static tempCenter = new THREE.Vector3();

  /**
   * Check if moving to target position would cause collision with obstacles
   * Kiểm tra việc di chuyển đến vị trí mục tiêu có gây va chạm với chướng ngại vật không
   * @param targetPosition - Desired position to move to
   * @param robotBox - Current bounding box of the robot
   * @param obstacles - Array of obstacles with bounds to check against
   * @returns True if collision would occur, false otherwise
   */
  public static checkCollision(targetPosition: THREE.Vector3, robotBox: THREE.Box3, obstacles: { bounds: THREE.Box3 }[]) {
    const center = robotBox.getCenter(this.tempCenter);
    const offset = this.tempVector.copy(targetPosition).sub(center);
    const projectedBox = this.tempBox.copy(robotBox).translate(offset);
    return obstacles.some((obstacle) => obstacle.bounds.intersectsBox(projectedBox));
  }

  /**
   * Create a bounding box for the robot centered at position
   * Tạo hộp giới hạn cho robot có tâm tại vị trí
   * @param center - Center position for the box
   * @param size - Size of the box (width, height, depth)
   * @returns Bounding box for the robot
   */
  public static createRobotBox(center: THREE.Vector3, size: number) {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(center.x, size / 2, center.z),
      new THREE.Vector3(size, size, size)
    );
  }
}
