import { normalize, sub } from '../core/Vec2';
import type { Simulation } from './Simulation';

const RANGED_ATTACK_INTERVAL = 1.8;
const RANGED_RANGE = 420;

export function updateEnemies(sim: Simulation, dt: number): void {
  const player = sim.player;

  for (const enemy of sim.enemies) {
    if (enemy.spawnTelegraph > 0) {
      enemy.spawnTelegraph -= dt;
      continue;
    }

    const toPlayer = sub(player.pos, enemy.pos);
    const distSq = toPlayer.x * toPlayer.x + toPlayer.y * toPlayer.y;
    const dir = normalize(toPlayer);

    const speedMult = enemy.slowTimer > 0 ? 0.4 : 1;
    if (enemy.slowTimer > 0) enemy.slowTimer -= dt;

    // Gentle separation so enemies don't perfectly overlap into one pixel.
    let sepX = 0;
    let sepY = 0;
    const neighbors = sim.enemyHash.queryNear(enemy.pos, 28);
    for (const other of neighbors) {
      if (other === enemy) continue;
      const dx = enemy.pos.x - other.pos.x;
      const dy = enemy.pos.y - other.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < 900) {
        const d = Math.sqrt(d2);
        sepX += (dx / d) * (30 - d) * 0.05;
        sepY += (dy / d) * (30 - d) * 0.05;
      }
    }

    const keepDistance = enemy.ranged && distSq < RANGED_RANGE * RANGED_RANGE * 0.4;
    const moveDir = keepDistance ? { x: -dir.x, y: -dir.y } : dir;

    enemy.vel.x = moveDir.x * enemy.speed * speedMult + sepX;
    enemy.vel.y = moveDir.y * enemy.speed * speedMult + sepY;
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;

    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    if (enemy.contactCooldown > 0) enemy.contactCooldown -= dt;

    if (enemy.ranged) {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0 && distSq < RANGED_RANGE * RANGED_RANGE) {
        enemy.attackTimer = RANGED_ATTACK_INTERVAL;
        sim.spawnHostileBolt(enemy);
      }
    }

    if (enemy.isBoss) {
      updateBossPattern(sim, enemy, dt);
    }
  }
}

function updateBossPattern(sim: Simulation, enemy: import('../entities/types').Enemy, dt: number): void {
  enemy.attackTimer -= dt;
  if (enemy.attackTimer > 0) return;

  switch (enemy.attackPattern) {
    case 'summon':
      enemy.attackTimer = 6;
      sim.bossSummonMinions(enemy, 4);
      break;
    case 'sweep':
      enemy.attackTimer = 3.5;
      sim.bossRadialBurst(enemy, 12);
      break;
    case 'burst':
      enemy.attackTimer = 2.5;
      sim.bossRadialBurst(enemy, 8);
      break;
    default:
      enemy.attackTimer = 4;
  }
}
