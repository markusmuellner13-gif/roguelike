import type { Viewport } from '../core/Viewport';
import type { Simulation } from '../systems/Simulation';
import type { StageDef } from '../data/types';

const SHAPE_DRAW: Record<string, (ctx: CanvasRenderingContext2D, r: number) => void> = {
  circle: (ctx, r) => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  },
  diamond: (ctx, r) => {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
  },
  triangle: (ctx, r) => {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.87, r * 0.6);
    ctx.lineTo(-r * 0.87, r * 0.6);
    ctx.closePath();
    ctx.fill();
  },
  square: (ctx, r) => {
    ctx.fillRect(-r, -r, r * 2, r * 2);
  },
  star: (ctx, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  },
};

export class Renderer {
  private time = 0;

  constructor(private viewport: Viewport) {}

  render(sim: Simulation, stage: StageDef): void {
    this.time += 1 / 60;
    const { ctx, width, height } = this.viewport;
    const cam = sim.player.pos;

    ctx.save();
    if (sim.screenShake > 0) {
      const s = sim.screenShake * 8;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    this.drawBackground(stage, cam, width, height);

    ctx.save();
    ctx.translate(width / 2 - cam.x, height / 2 - cam.y);

    this.drawPickups(sim);
    this.drawParticles(sim);
    this.drawProjectiles(sim);
    this.drawEnemies(sim);
    this.drawPlayer(sim);
    this.drawFloatingTexts(sim);

    ctx.restore();
    ctx.restore();
  }

  private drawBackground(stage: StageDef, cam: { x: number; y: number }, w: number, h: number): void {
    const { ctx } = this.viewport;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, stage.bgColorA);
    grad.addColorStop(1, stage.bgColorB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Parallax floor dots tied to world position for a sense of motion/depth.
    // Deliberately dots, not full-width lines — a stray line here reads as
    // a stray UI bar (it was getting confused for the XP bar in playtests).
    const gridSize = 64;
    const offX = ((-cam.x * 0.5) % gridSize) + gridSize;
    const offY = ((-cam.y * 0.5) % gridSize) + gridSize;
    ctx.fillStyle = stage.accentColor + '33';
    for (let x = -gridSize; x < w + gridSize; x += gridSize) {
      const gx = x + (offX % gridSize);
      for (let y = -gridSize; y < h + gridSize; y += gridSize) {
        const gy = y + (offY % gridSize);
        ctx.beginPath();
        ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Slow drifting glow orbs for casino ambience.
    for (let i = 0; i < 5; i++) {
      const a = this.time * 0.05 + i * 1.7;
      const ox = w / 2 + Math.cos(a) * w * 0.4 - cam.x * 0.2;
      const oy = h / 2 + Math.sin(a * 0.8) * h * 0.4 - cam.y * 0.2;
      const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 220);
      rg.addColorStop(0, stage.accentColor + '22');
      rg.addColorStop(1, stage.accentColor + '00');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawPlayer(sim: Simulation): void {
    const { ctx } = this.viewport;
    const p = sim.player;
    const blink = p.invulnTimer > 0 && Math.floor(this.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.globalAlpha = blink ? 0.4 : 1;

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 2.2);
    glow.addColorStop(0, p.color + '55');
    glow.addColorStop(1, p.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${p.radius * 1.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, 0, 1);
    ctx.restore();
  }

  private drawEnemies(sim: Simulation): void {
    const { ctx } = this.viewport;
    for (const e of sim.enemies) {
      ctx.save();
      ctx.translate(e.pos.x, e.pos.y);
      const telegraph = e.spawnTelegraph > 0;
      ctx.globalAlpha = telegraph ? 0.35 : 1;
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
      const draw = SHAPE_DRAW[e.shape] ?? SHAPE_DRAW.circle;
      draw(ctx, telegraph ? e.radius * (1 - e.spawnTelegraph / 0.25) : e.radius);

      if (e.isBoss) {
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      if (e.hp < e.maxHp && !telegraph) {
        const w = e.radius * 2;
        const frac = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = '#00000088';
        ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 10, w, 4);
        ctx.fillStyle = frac > 0.4 ? '#7cffb2' : '#ff5c5c';
        ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 10, w * frac, 4);
      }
    }
  }

  private drawProjectiles(sim: Simulation): void {
    const { ctx } = this.viewport;
    for (const p of sim.projectiles) {
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.shape === 'beam' ? 18 : 8;
      if (p.shape === 'beam') {
        ctx.rotate(p.angle);
        ctx.fillRect(-p.radius * 3, -p.radius / 2, p.radius * 6, p.radius);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPickups(sim: Simulation): void {
    const { ctx } = this.viewport;
    for (const pk of sim.pickups) {
      const colors: Record<string, string> = {
        xp_small: '#7fe8ff',
        xp_med: '#7fe8ff',
        xp_large: '#c99bff',
        chip: '#ffd76a',
        heal: '#ff6a6a',
        magnet: '#ffffff',
      };
      ctx.save();
      ctx.translate(pk.pos.x, pk.pos.y);
      ctx.fillStyle = colors[pk.kind] ?? '#ffffff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, pk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(sim: Simulation): void {
    const { ctx } = this.viewport;
    for (const p of sim.particles) {
      ctx.globalAlpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(sim: Simulation): void {
    const { ctx } = this.viewport;
    ctx.textAlign = 'center';
    for (const t of sim.floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px 'Rubik', sans-serif`;
      ctx.fillText(t.text, t.pos.x, t.pos.y);
    }
    ctx.globalAlpha = 1;
  }
}
