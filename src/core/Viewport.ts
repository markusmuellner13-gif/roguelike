/**
 * Keeps a canvas backing-store pixel-perfect across any device size,
 * pixel density, or orientation change: caps devicePixelRatio for
 * performance on cheap phones, resizes on `resize`/`orientationchange`/
 * visualViewport events, and reports safe logical (CSS-pixel) dimensions
 * for gameplay + UI layout math.
 */
export class Viewport {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;
  private onResizeCb: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(document.documentElement);
    window.addEventListener('orientationchange', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onResize(cb: () => void): void {
    this.onResizeCb = cb;
  }

  private resize(): void {
    const rect = document.documentElement.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    // Cap DPR: crisp on retina, but never renders more pixels than a
    // mid-range phone GPU can push at 60fps during heavy particle load.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.onResizeCb?.();
  }

  /** Rough device-class hint used to scale UI density / particle budget. */
  get sizeClass(): 'compact' | 'regular' | 'wide' {
    if (this.width < 560) return 'compact';
    if (this.width < 1024) return 'regular';
    return 'wide';
  }
}
