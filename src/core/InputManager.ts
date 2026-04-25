export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turn: boolean;
  suction: boolean;   // Sweep (E)
  mop: boolean;       // Mop (R)
  mouseDeltaX: number;
  mouseDeltaY: number;
  isLocked: boolean;
};

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
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onMouseDown = () => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.state.isLocked) {
      this.state.mouseDeltaX += event.movementX;
      this.state.mouseDeltaY += event.movementY;
    }
  };

  private onPointerLockChange = () => {
    this.state.isLocked = document.pointerLockElement === document.body;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    this.setKey(event.code, true);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.setKey(event.code, false);
  };

  private setKey(code: string, value: boolean) {
    switch (code) {
      case 'KeyW':
        this.state.forward = value;
        break;
      case 'KeyS':
        this.state.backward = value;
        break;
      case 'KeyA':
        this.state.left = value;
        break;
      case 'KeyD':
        this.state.right = value;
        break;
      case 'KeyQ':
        this.state.turn = value;
        break;
      case 'KeyE':
        this.state.suction = value;
        break;
      case 'KeyR':
        this.state.mop = value;
        break;
    }
  }
}
