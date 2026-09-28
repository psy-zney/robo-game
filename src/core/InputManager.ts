/**
 * Input state interface tracking all player inputs
 * Giao diện trạng thái đầu vào theo dõi tất cả đầu vào của người chơi
 */
export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turn: boolean;
  suction: boolean;   // Sweep (E) - Quét (E)
  mop: boolean;       // Mop (R) - Lau (R)
  mouseDeltaX: number;
  mouseDeltaY: number;
  isLocked: boolean;
  // Camera adjustment controls
  // Điều khiển điều chỉnh camera
  cameraUp: boolean;    // PageUp - increase camera height - Tăng chiều cao camera
  cameraDown: boolean;  // PageDown - decrease camera height - Giảm chiều cao camera
  fovIncrease: boolean; // ] - increase FOV - Tăng FOV
  fovDecrease: boolean; // [ - decrease FOV - Giảm FOV
  resetCamera: boolean; // Home - reset camera view - Đặt lại góc nhìn camera
};

/**
 * InputManager - Handles all keyboard and mouse input for the game
 * InputManager - Xử lý tất cả đầu vào bàn phím và chuột cho game
 */
export class InputManager {
  public state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    turn: false,
    suction: false,
    mop: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    isLocked: false,
    // Camera adjustment controls
    // Điều khiển điều chỉnh camera
    cameraUp: false,
    cameraDown: false,
    fovIncrease: false,
    fovDecrease: false,
    resetCamera: false,
  };

  /**
   * Initialize input manager and attach event listeners
   * Khởi tạo trình quản lý đầu vào và đính kèm trình nghe sự kiện
   */
  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('blur', () => {
      this.reset();
      if (document.pointerLockElement) document.exitPointerLock();
    });
  }

  /**
   * Handle mouse down event to request pointer lock
   * Xử lý sự kiện chuột xuống để yêu cầu khóa con trỏ
   */
  private onMouseDown = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, select, input, textarea, a, dialog, #story-screen, #start-screen, #loading-screen, #pause-screen, #game-over-screen, .hub, .pause, .game-over-content')) {
      return;
    }

    const gameUI = document.getElementById('game-ui');
    if (!gameUI?.classList.contains('active')) {
      return;
    }

    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  };

  /**
   * Handle mouse move event to track camera rotation
   * Xử lý sự kiện di chuyển chuột để theo dõi xoay camera
   * @param event - Mouse move event
   */
  private onMouseMove = (event: MouseEvent) => {
    if (this.state.isLocked) {
      this.state.mouseDeltaX += event.movementX;
      this.state.mouseDeltaY += event.movementY;
    }
  };

  /**
   * Handle pointer lock change event
   * Xử lý sự kiện thay đổi khóa con trỏ
   */
  private onPointerLockChange = () => {
    this.state.isLocked = document.pointerLockElement === document.body;
    this.reset();
  };

  public reset() {
    for (const key of Object.keys(this.state) as Array<keyof InputState>) {
      if (key === 'isLocked') continue;
      if (key === 'mouseDeltaX' || key === 'mouseDeltaY') this.state[key] = 0;
      else this.state[key] = false;
    }
  }

  /**
   * Handle key down event
   * Xử lý sự kiện phím xuống
   * @param event - Keyboard event
   */
  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.state.isLocked) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home'].includes(event.code)) event.preventDefault();
    if (event.repeat && (event.code === 'KeyE' || event.code === 'KeyR')) return;
    this.setKey(event.code, true);
  };

  /**
   * Handle key up event
   * Xử lý sự kiện phím lên
   * @param event - Keyboard event
   */
  private onKeyUp = (event: KeyboardEvent) => {
    this.setKey(event.code, false);
  };

  /**
   * Set input state based on key code
   * Đặt trạng thái đầu vào dựa trên mã phím
   * @param code - Keyboard code
   * @param value - True for key down, false for key up
   */
  private setKey(code: string, value: boolean) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = value;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = value;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = value;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = value;
        break;
      case 'KeyQ':
        this.state.turn = value;
        break;
      case 'KeyE':
        this.state.suction = value;
        if (value) this.state.mop = false;
        break;
      case 'KeyR':
        this.state.mop = value;
        if (value) this.state.suction = false;
        break;
      // Camera adjustment controls
      // Điều khiển điều chỉnh camera
      case 'PageUp':
        this.state.cameraUp = value;
        break;
      case 'PageDown':
        this.state.cameraDown = value;
        break;
      case 'BracketRight':
        this.state.fovIncrease = value;
        break;
      case 'BracketLeft':
        this.state.fovDecrease = value;
        break;
      case 'Home':
        this.state.resetCamera = value;
        break;
    }
  }
}
