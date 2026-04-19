export type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turn: boolean;
  suction: boolean;
};

export class InputManager {
  public state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    turn: false,
    suction: false,
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

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
    }
  }
}
