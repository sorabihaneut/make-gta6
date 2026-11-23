// Sol Corona: Vice Coast - Unified Input Manager

export class InputManager {
  constructor() {
    this.keys = new Map();
    this.justPressed = new Map();
    this.mouse = {
      x: 0,
      y: 0,
      down: false,
      rightDown: false,
      worldX: 0,
      worldY: 0,
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onKeyDown(e) {
    const code = e.code;
    if (!this.keys.get(code)) {
      this.justPressed.set(code, true);
    }
    this.keys.set(code, true);

    // Prevent default browser scroll on arrow keys and space
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    this.keys.set(e.code, false);
    this.justPressed.delete(e.code);
  }

  onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  onMouseDown(e) {
    if (e.button === 0) this.mouse.down = true;
    if (e.button === 2) this.mouse.rightDown = true;
  }

  onMouseUp(e) {
    if (e.button === 0) this.mouse.down = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  isDown(code) {
    return !!this.keys.get(code);
  }

  wasPressed(code) {
    if (this.justPressed.get(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  // Helper bindings
  isUp() {
    return this.isDown('KeyW') || this.isDown('ArrowUp');
  }

  isDownKey() {
    return this.isDown('KeyS') || this.isDown('ArrowDown');
  }

  isLeft() {
    return this.isDown('KeyA') || this.isDown('ArrowLeft');
  }

  isRight() {
    return this.isDown('KeyD') || this.isDown('ArrowRight');
  }

  isSprint() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  isHandbrake() {
    return this.isDown('Space');
  }

  isAction() {
    return this.wasPressed('KeyF') || this.wasPressed('Enter');
  }

  isInteract() {
    return this.wasPressed('KeyE');
  }

  isRadioNext() {
    return this.wasPressed('KeyR');
  }

  isMapToggle() {
    return this.wasPressed('KeyM');
  }

  isPauseToggle() {
    return this.wasPressed('Escape');
  }

  updateWorldMouse(camera) {
    this.mouse.worldX = (this.mouse.x - camera.viewportWidth / 2) / camera.zoom + camera.x;
    this.mouse.worldY = (this.mouse.y - camera.viewportHeight / 2) / camera.zoom + camera.y;
  }
}
