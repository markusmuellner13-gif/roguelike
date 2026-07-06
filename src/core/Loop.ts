/**
 * Fixed-timestep simulation with an interpolation-free accumulator.
 * Decouples game logic (deterministic at 60Hz) from display refresh
 * rate so a 144Hz monitor and a throttled background tab both play
 * out identically, and a stalled tab doesn't "catch up" with a death
 * spiral of huge steps.
 */
export class GameLoop {
  private readonly step = 1 / 60;
  private readonly maxStepsPerFrame = 5;
  private acc = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    let frameTime = (now - this.last) / 1000;
    this.last = now;
    if (frameTime > 0.25) frameTime = 0.25;
    this.acc += frameTime;

    let steps = 0;
    while (this.acc >= this.step && steps < this.maxStepsPerFrame) {
      this.update(this.step);
      this.acc -= this.step;
      steps++;
    }
    this.render(this.acc / this.step);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
