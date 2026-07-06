import type { StageDef } from '../data/types';
import { ENEMIES } from '../data/enemies';
import type { Enemy } from '../entities/types';
import type { Rng } from '../core/Random';
import type { Simulation } from './Simulation';

const MAX_ENEMIES = 240;

export class Spawner {
  private timer = 0;
  private uid = 1;
  private bossSpawned = false;
  private secondBossSpawned = false;

  constructor(
    private readonly stage: StageDef,
    private readonly rng: Rng,
  ) {}

  update(sim: Simulation, dt: number, elapsed: number): void {
    this.timer -= dt;
    const minutes = elapsed / 60;

    if (this.timer <= 0 && sim.enemies.length < MAX_ENEMIES) {
      const interval = Math.max(0.14, 1.05 - minutes * 0.045);
      const batch = 1 + Math.floor(minutes / 2.2);
      for (let i = 0; i < batch; i++) this.spawnOne(sim, elapsed);
      this.timer = interval;
    }

    if (!this.bossSpawned && elapsed >= this.stage.durationSec * 0.5) {
      this.bossSpawned = true;
      sim.spawnBoss(this.stage.boss, 1);
    }
    if (!this.secondBossSpawned && elapsed >= this.stage.durationSec * 0.88) {
      this.secondBossSpawned = true;
      sim.spawnBoss(this.stage.boss, 1.6);
    }
  }

  private spawnOne(sim: Simulation, elapsed: number): void {
    const kind = this.rng.pick(this.stage.enemyPool);
    const def = ENEMIES[kind];
    const minutes = elapsed / 60;
    const hpMult = 1 + minutes * 0.16;
    const dmgMult = 1 + minutes * 0.1;

    const angle = this.rng.range(0, Math.PI * 2);
    const spawnRadius = 640;
    const pos = {
      x: sim.player.pos.x + Math.cos(angle) * spawnRadius,
      y: sim.player.pos.y + Math.sin(angle) * spawnRadius,
    };

    const enemy: Enemy = {
      uid: this.uid++,
      kind: def.kind,
      name: def.name,
      pos,
      vel: { x: 0, y: 0 },
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      speed: def.speed,
      damage: Math.round(def.damage * dmgMult),
      radius: def.radius,
      xp: def.xp,
      color: def.color,
      shape: def.shape,
      hitFlash: 0,
      attackTimer: this.rng.range(0.3, 1.2),
      ranged: def.ranged ?? false,
      isBoss: false,
      slowTimer: 0,
      contactCooldown: 0,
      spawnTelegraph: 0.25,
    };
    sim.enemies.push(enemy);
  }

  nextUid(): number {
    return this.uid++;
  }
}
