import type { Vec2 } from './Vec2';
import { clamp, len } from './Vec2';

/**
 * Unified movement + action input: keyboard (WASD/arrows), on-screen
 * virtual joystick (touch/pen), and gamepad left stick. All three feed
 * the same normalized `move` vector so gameplay code never branches
 * on input device.
 */
export class InputManager {
  move: Vec2 = { x: 0, y: 0 };
  pausePressed = false;
  private keys = new Set<string>();
  private joystickActive = false;
  private joystickOrigin: Vec2 = { x: 0, y: 0 };
  private joystickVec: Vec2 = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;
  private padIndex: number | null = null;

  private joystickBase: HTMLElement;
  private joystickThumb: HTMLElement;
  private touchLayer: HTMLElement;

  constructor(touchLayer: HTMLElement, joystickBase: HTMLElement, joystickThumb: HTMLElement) {
    this.touchLayer = touchLayer;
    this.joystickBase = joystickBase;
    this.joystickThumb = joystickThumb;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);

    this.touchLayer.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    window.addEventListener('gamepadconnected', (e) => {
      this.padIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.padIndex === e.gamepad.index) this.padIndex = null;
    });
  }

  get usingTouch(): boolean {
    return this.joystickActive;
  }

  update(): void {
    this.pausePressed = false;

    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    if (x !== 0 || y !== 0) {
      const l = Math.hypot(x, y) || 1;
      this.move = { x: x / l, y: y / l };
    } else if (this.joystickActive) {
      this.move = this.joystickVec;
    } else if (this.padIndex !== null) {
      const pad = navigator.getGamepads()[this.padIndex];
      if (pad) {
        const px = pad.axes[0] ?? 0;
        const py = pad.axes[1] ?? 0;
        const mag = Math.hypot(px, py);
        this.move = mag > 0.15 ? { x: px, y: py } : { x: 0, y: 0 };
        if (pad.buttons[9]?.pressed) this.pausePressed = true;
      } else {
        this.move = { x: 0, y: 0 };
      }
    } else {
      this.move = { x: 0, y: 0 };
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
    this.touchLayer.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private reset = () => {
    this.keys.clear();
    this.joystickActive = false;
    this.joystickVec = { x: 0, y: 0 };
    this.joystickBase.style.opacity = '0';
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.joystickPointerId !== null) return;
    this.joystickPointerId = e.pointerId;
    this.joystickActive = true;
    this.joystickOrigin = { x: e.clientX, y: e.clientY };
    this.joystickVec = { x: 0, y: 0 };
    this.joystickBase.style.opacity = '1';
    this.joystickBase.style.left = `${e.clientX}px`;
    this.joystickBase.style.top = `${e.clientY}px`;
    this.joystickThumb.style.transform = `translate(-50%, -50%)`;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.joystickPointerId !== e.pointerId) return;
    const dx = e.clientX - this.joystickOrigin.x;
    const dy = e.clientY - this.joystickOrigin.y;
    const maxRadius = 46;
    const magnitude = clamp(len({ x: dx, y: dy }), 0, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * magnitude;
    const clampedY = Math.sin(angle) * magnitude;
    this.joystickThumb.style.transform = `translate(${clampedX - 20}px, ${clampedY - 20}px)`;
    const norm = magnitude / maxRadius;
    this.joystickVec = norm > 0.12 ? { x: (clampedX / maxRadius) * 1, y: (clampedY / maxRadius) * 1 } : { x: 0, y: 0 };
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.joystickPointerId !== e.pointerId) return;
    this.joystickPointerId = null;
    this.joystickActive = false;
    this.joystickVec = { x: 0, y: 0 };
    this.joystickBase.style.opacity = '0';
  };
}
