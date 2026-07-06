import { angleTo, normalize, sub } from '../core/Vec2';
import { WEAPONS } from '../data/weapons';
import type { WeaponId } from '../data/types';
import type { Enemy, Player, Projectile, WeaponInstance } from '../entities/types';
import { damageMultiplierFromMight, effectiveCooldownReduction } from './Stats';
import type { Simulation } from './Simulation';

let projectileUid = 1;

function levelScalar(level: number): number {
  return 1 + (level - 1) * 0.32;
}

function cooldownScalar(level: number): number {
  return Math.max(0.55, 1 - (level - 1) * 0.065);
}

export function computeCooldown(weapon: WeaponInstance, player: Player): number {
  const def = WEAPONS[weapon.id];
  const evolveMult = weapon.evolved ? 0.8 : 1;
  const reduction = effectiveCooldownReduction(player.cooldownReductionPct);
  return def.baseCooldown * cooldownScalar(weapon.level) * evolveMult * (1 - reduction);
}

function baseDamage(weapon: WeaponInstance, player: Player): { dmg: number; crit: boolean } {
  const def = WEAPONS[weapon.id];
  const evolveMult = weapon.evolved ? 1.6 : 1;
  let dmg = def.baseDamage * levelScalar(weapon.level) * damageMultiplierFromMight(player.might) * evolveMult;
  const crit = Math.random() < player.critChance;
  if (crit) dmg *= 2;
  return { dmg: Math.round(dmg), crit };
}

function newProjectile(partial: Omit<Projectile, 'uid' | 'hitSet'>): Projectile {
  return { ...partial, uid: projectileUid++, hitSet: new Set() };
}

function findNearestEnemy(sim: Simulation, from = sim.player.pos): Enemy | null {
  let best: Enemy | null = null;
  let bestDist = Infinity;
  for (const e of sim.enemies) {
    const d = (e.pos.x - from.x) ** 2 + (e.pos.y - from.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

export function fireWeapon(sim: Simulation, weapon: WeaponInstance): void {
  const def = WEAPONS[weapon.id];
  const player = sim.player;
  const pierce = weapon.evolved ? 4 : Math.min(4, 1 + Math.floor(weapon.level / 3));

  switch (weapon.id as WeaponId) {
    case 'chip_shooter': {
      const target = findNearestEnemy(sim);
      if (!target) return;
      const dir = normalize(sub(target.pos, player.pos));
      const { dmg, crit } = baseDamage(weapon, player);
      const count = weapon.evolved ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.12;
        const angle = Math.atan2(dir.y, dir.x) + spread;
        sim.projectiles.push(
          newProjectile({
            pos: { ...player.pos },
            vel: { x: Math.cos(angle) * 420, y: Math.sin(angle) * 420 },
            damage: dmg,
            radius: 6,
            life: 1.4,
            maxLife: 1.4,
            pierce: weapon.evolved ? 99 : pierce,
            color: def.color,
            shape: 'chip',
            weapon: weapon.id,
            angle,
            crit,
          }),
        );
      }
      break;
    }
    case 'lucky_dice': {
      const target = findNearestEnemy(sim);
      if (!target) return;
      const dir = normalize(sub(target.pos, player.pos));
      const { dmg, crit } = baseDamage(weapon, player);
      sim.projectiles.push(
        newProjectile({
          pos: { ...player.pos },
          vel: { x: dir.x * 280, y: dir.y * 280 },
          damage: dmg,
          radius: 9,
          life: 3,
          maxLife: 3,
          pierce: weapon.evolved ? 6 : 2 + Math.floor(weapon.level / 2),
          color: def.color,
          shape: 'die',
          weapon: weapon.id,
          angle: 0,
          crit,
        }),
      );
      break;
    }
    case 'card_fan': {
      const target = findNearestEnemy(sim);
      const baseAngle = target ? angleTo(player.pos, target.pos) : player.facing;
      const count = weapon.evolved ? 7 : 3 + Math.floor(weapon.level / 3);
      const spreadTotal = weapon.evolved ? Math.PI : Math.PI / 3;
      const { dmg, crit } = baseDamage(weapon, player);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const angle = baseAngle + t * spreadTotal;
        sim.projectiles.push(
          newProjectile({
            pos: { ...player.pos },
            vel: { x: Math.cos(angle) * 380, y: Math.sin(angle) * 380 },
            damage: dmg,
            radius: 7,
            life: 0.9,
            maxLife: 0.9,
            pierce: weapon.evolved ? 99 : pierce,
            color: def.color,
            shape: 'card',
            weapon: weapon.id,
            angle,
            crit,
          }),
        );
      }
      break;
    }
    case 'slot_beam': {
      const target = findNearestEnemy(sim);
      const angle = target ? angleTo(player.pos, target.pos) : player.facing;
      const { dmg, crit } = baseDamage(weapon, player);
      const beams = weapon.evolved ? 3 : 1;
      for (let i = 0; i < beams; i++) {
        const a = angle + (i - (beams - 1) / 2) * 0.35;
        sim.projectiles.push(
          newProjectile({
            pos: { x: player.pos.x + Math.cos(a) * 20, y: player.pos.y + Math.sin(a) * 20 },
            vel: { x: Math.cos(a) * 900, y: Math.sin(a) * 900 },
            damage: dmg,
            radius: 11 + weapon.level,
            life: 0.45,
            maxLife: 0.45,
            pierce: 999,
            color: def.color,
            shape: 'beam',
            weapon: weapon.id,
            angle: a,
            crit,
          }),
        );
      }
      break;
    }
    case 'coin_storm': {
      const { dmg, crit } = baseDamage(weapon, player);
      const count = 6 + weapon.level + (weapon.evolved ? 6 : 0);
      const radius = 140 + weapon.level * 8;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        sim.projectiles.push(
          newProjectile({
            pos: { x: player.pos.x + Math.cos(a) * r, y: player.pos.y + Math.sin(a) * r },
            vel: { x: 0, y: 40 },
            damage: dmg,
            radius: 10,
            life: 0.5,
            maxLife: 0.5,
            pierce: weapon.evolved ? 3 : 1,
            color: def.color,
            shape: 'coin',
            weapon: weapon.id,
            angle: 0,
            crit,
          }),
        );
      }
      break;
    }
    case 'neon_whip': {
      const target = findNearestEnemy(sim);
      const angle = target ? angleTo(player.pos, target.pos) : player.facing;
      const { dmg, crit } = baseDamage(weapon, player);
      const reach = 90 + weapon.level * 6 + (weapon.evolved ? 60 : 0);
      const halfArc = weapon.evolved ? Math.PI * 0.9 : Math.PI / 5;
      sim.hitArc(player.pos, angle, halfArc, reach, dmg, crit, def.color);
      break;
    }
    case 'jackpot_bomb': {
      const target = findNearestEnemy(sim);
      const angle = target ? angleTo(player.pos, target.pos) : player.facing;
      const { dmg, crit } = baseDamage(weapon, player);
      sim.projectiles.push(
        newProjectile({
          pos: { ...player.pos },
          vel: { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 },
          damage: dmg,
          radius: 10,
          life: 0.75,
          maxLife: 0.75,
          pierce: 99,
          color: def.color,
          shape: 'bomb',
          weapon: weapon.id,
          angle,
          crit,
          explodeRadius: 90 + weapon.level * 10 + (weapon.evolved ? 50 : 0),
        }),
      );
      break;
    }
    case 'roulette_orbit': {
      // Persistent orbiters are (re)synced each cadence rather than fired.
      sim.syncOrbiters(weapon);
      break;
    }
  }
}

export function findNearest(sim: Simulation, from = sim.player.pos): Enemy | null {
  return findNearestEnemy(sim, from);
}
