import { clamp, dist, distSq, len, normalize, sub } from '../core/Vec2';
import type { Vec2 } from '../core/Vec2';
import { Rng } from '../core/Random';
import { SpatialHash } from '../core/SpatialHash';
import type { CharacterDef, PassiveId, StageDef, WeaponId } from '../data/types';
import { BOSSES, ENEMIES } from '../data/enemies';
import { WEAPONS } from '../data/weapons';
import { PASSIVES } from '../data/passives';
import type { Enemy, FloatingText, Particle, Pickup, Player, Projectile, WeaponInstance, PassiveInstance } from '../entities/types';
import { Profile } from '../state/Profile';
import { createPlayer, xpForLevel } from './Stats';
import { computeCooldown, fireWeapon } from './WeaponSystem';
import { updateEnemies } from './EnemyAI';
import { Spawner } from './Spawner';
import { buildUpgradePool, rollSlotResults, type SlotResult, type UpgradeOption } from './Upgrades';

export interface SimCallbacks {
  onLevelUp: (result: SlotResult) => void;
  onDeath: () => void;
  onVictory: () => void;
  onKill: (enemy: Enemy) => void;
  onPlayerHit: (amount: number) => void;
  onChip: () => void;
  onBossSpawn: (name: string) => void;
  onBossDown: (name: string) => void;
}

let pUid = 1;
let enemyProjUid = 1;

export class Simulation {
  player: Player;
  weapons: WeaponInstance[] = [];
  passives: PassiveInstance[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  floatingTexts: FloatingText[] = [];
  enemyHash = new SpatialHash<Enemy>(80);

  elapsed = 0;
  kills = 0;
  chipsEarned = 0;
  paused = false;
  ended = false;
  won = false;
  screenShake = 0;
  moveInput: Vec2 = { x: 0, y: 0 };

  private rng: Rng;
  private spawner: Spawner;
  private orbitWeaponLevel = 0;

  constructor(
    public character: CharacterDef,
    public stage: StageDef,
    profile: Profile,
    seed: string,
    private callbacks: SimCallbacks,
  ) {
    this.rng = Rng.fromString(seed);
    this.player = createPlayer(character, profile);
    this.weapons.push({ id: character.startingWeapon, level: 1, timer: 0.3, evolved: false });
    this.spawner = new Spawner(stage, this.rng);
  }

  update(dt: number): void {
    if (this.paused || this.ended) return;
    this.elapsed += dt;

    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);

    this.enemyHash.clear();
    for (const e of this.enemies) this.enemyHash.insert(e);
    updateEnemies(this, dt);

    this.handleCollisions();
    this.updatePickups(dt);
    this.updateParticles(dt);

    this.spawner.update(this, dt, this.elapsed);

    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 4);

    if (this.player.hp <= 0 && !this.ended) {
      this.handleDeath();
    } else if (this.elapsed >= this.stage.durationSec && !this.ended) {
      this.ended = true;
      this.won = true;
      this.callbacks.onVictory();
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    const speed = 190 * p.speedMult;
    p.pos.x += this.moveInput.x * speed * dt;
    p.pos.y += this.moveInput.y * speed * dt;
    if (len(this.moveInput) > 0.05) p.facing = Math.atan2(this.moveInput.y, this.moveInput.x);

    if (p.regen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    }
  }

  private updateWeapons(dt: number): void {
    for (const w of this.weapons) {
      w.timer -= dt;
      if (w.timer <= 0) {
        fireWeapon(this, w);
        w.timer = computeCooldown(w, this.player);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.shape === 'orbit') {
        proj.orbitAngle = (proj.orbitAngle ?? 0) + dt * 2.6;
        proj.pos.x = this.player.pos.x + Math.cos(proj.orbitAngle) * (proj.orbitRadius ?? 70);
        proj.pos.y = this.player.pos.y + Math.sin(proj.orbitAngle) * (proj.orbitRadius ?? 70);
      } else {
        proj.pos.x += proj.vel.x * dt;
        proj.pos.y += proj.vel.y * dt;
      }
      proj.life -= dt;
      if (proj.life <= 0) {
        if (proj.explodeRadius) this.explode(proj);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private explode(proj: Projectile): void {
    this.spawnBurst(proj.pos, proj.color, 22);
    this.screenShake = Math.max(this.screenShake, 0.4);
    const radius = proj.explodeRadius ?? 80;
    for (const e of this.enemyHash.queryNear(proj.pos, radius)) {
      if (dist(e.pos, proj.pos) <= radius + e.radius) {
        this.damageEnemy(e, proj.damage, false);
      }
    }
  }

  hitArc(origin: Vec2, angle: number, halfArc: number, reach: number, dmg: number, crit: boolean, color: string): void {
    for (const e of this.enemyHash.queryNear(origin, reach)) {
      const toE = sub(e.pos, origin);
      const d = len(toE);
      if (d > reach + e.radius) continue;
      const a = Math.atan2(toE.y, toE.x);
      let diff = Math.abs(a - angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff <= halfArc) {
        this.damageEnemy(e, dmg, crit);
      }
    }
    this.spawnBurst({ x: origin.x + Math.cos(angle) * reach * 0.6, y: origin.y + Math.sin(angle) * reach * 0.6 }, color, 6);
  }

  syncOrbiters(weapon: WeaponInstance): void {
    const def = WEAPONS[weapon.id];
    const count = weapon.evolved ? 4 : Math.min(3, 1 + Math.floor(weapon.level / 3));
    const existing = this.projectiles.filter((p) => p.weapon === weapon.id && p.shape === 'orbit');
    if (existing.length === count && this.orbitWeaponLevel === weapon.level) {
      weapon.timer = 0.2;
      return;
    }
    for (const p of existing) {
      const idx = this.projectiles.indexOf(p);
      if (idx >= 0) this.projectiles.splice(idx, 1);
    }
    const dmg = Math.round(def.baseDamage * (1 + (weapon.level - 1) * 0.32) * (1 + this.player.might / 100) * (weapon.evolved ? 1.4 : 1));
    for (let i = 0; i < count; i++) {
      this.projectiles.push({
        uid: pUid++,
        pos: { ...this.player.pos },
        vel: { x: 0, y: 0 },
        damage: dmg,
        radius: 12,
        life: 999,
        maxLife: 999,
        pierce: 999,
        hitSet: new Set(),
        color: def.color,
        shape: 'orbit',
        weapon: weapon.id,
        angle: 0,
        orbitAngle: (Math.PI * 2 * i) / count,
        orbitRadius: weapon.evolved ? 110 : 75,
      });
    }
    this.orbitWeaponLevel = weapon.level;
    weapon.timer = 0.2;
  }

  private handleCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.hostile) continue;
      let removed = false;

      const nearby = this.enemyHash.queryNear(proj.pos, proj.radius + 40);
      for (const enemy of nearby) {
        if (proj.shape === 'orbit') {
          const map = proj.lastHit ?? (proj.lastHit = new Map<number, number>());
          const nextAllowed = map.get(enemy.uid) ?? 0;
          if (this.elapsed < nextAllowed) continue;
          if (dist(enemy.pos, proj.pos) <= proj.radius + enemy.radius) {
            this.damageEnemy(enemy, proj.damage, false);
            map.set(enemy.uid, this.elapsed + 0.5);
          }
          continue;
        }

        if (proj.hitSet.has(enemy.uid)) continue;
        if (dist(enemy.pos, proj.pos) > proj.radius + enemy.radius) continue;

        this.damageEnemy(enemy, proj.damage, proj.crit ?? false);
        proj.hitSet.add(enemy.uid);

        if (proj.shape === 'die') {
          const next = this.findNearestExcluding(proj.pos, proj.hitSet);
          if (next) {
            const dir = normalize(sub(next.pos, proj.pos));
            proj.vel = { x: dir.x * 280, y: dir.y * 280 };
          }
        }

        proj.pierce -= 1;
        if (proj.pierce < 0) {
          if (proj.explodeRadius) this.explode(proj);
          this.projectiles.splice(i, 1);
          removed = true;
          break;
        }
      }
      if (removed) continue;
    }

    // Hostile projectiles vs player.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.hostile) continue;
      if (dist(proj.pos, this.player.pos) <= proj.radius + this.player.radius) {
        this.damagePlayer(proj.damage);
        this.projectiles.splice(i, 1);
      }
    }

    // Enemy contact damage vs player.
    for (const enemy of this.enemies) {
      if (enemy.spawnTelegraph > 0 || enemy.contactCooldown > 0) continue;
      if (dist(enemy.pos, this.player.pos) <= enemy.radius + this.player.radius) {
        this.damagePlayer(enemy.damage);
        enemy.contactCooldown = 0.6;
      }
    }

    // Remove dead enemies.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].hp <= 0) {
        this.killEnemyAt(i);
      }
    }
  }

  private findNearestExcluding(pos: Vec2, exclude: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (exclude.has(e.uid)) continue;
      const d = distSq(e.pos, pos);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  damageEnemy(enemy: Enemy, amount: number, crit: boolean): void {
    enemy.hp -= amount;
    enemy.hitFlash = 0.12;
    this.addFloatingText(enemy.pos, `${Math.round(amount)}`, crit ? '#ffd76a' : '#ffffff', crit ? 22 : 15);
  }

  private killEnemyAt(index: number): void {
    const enemy = this.enemies[index];
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.spawnBurst(enemy.pos, enemy.color, enemy.isBoss ? 40 : 10);
    this.dropPickups(enemy);
    this.callbacks.onKill(enemy);
    if (enemy.isBoss) {
      this.callbacks.onBossDown(enemy.name);
      this.screenShake = 1;
    }
    this.addXp(enemy.xp);
  }

  private dropPickups(enemy: Enemy): void {
    const xpKind = enemy.xp >= 20 ? 'xp_large' : enemy.xp >= 6 ? 'xp_med' : 'xp_small';
    this.pickups.push(this.makePickup(xpKind, enemy.pos, enemy.xp));

    const chipChance = 0.12 + Math.min(this.player.luck, 60) * 0.003;
    if (this.rng.chance(chipChance) || enemy.isBoss) {
      this.pickups.push(this.makePickup('chip', enemy.pos, enemy.isBoss ? 80 : this.rng.int(1, 4)));
    }
    if (this.rng.chance(0.01) && this.player.hp < this.player.maxHp) {
      this.pickups.push(this.makePickup('heal', enemy.pos, 15));
    }
  }

  private makePickup(kind: Pickup['kind'], pos: Vec2, value: number): Pickup {
    return {
      uid: pUid++,
      kind,
      pos: { x: pos.x + this.rng.range(-8, 8), y: pos.y + this.rng.range(-8, 8) },
      vel: { x: 0, y: 0 },
      value,
      radius: kind === 'chip' ? 7 : 6,
      age: 0,
      magnetized: false,
    };
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.age += dt;
      const d = dist(pk.pos, this.player.pos);
      if (d < this.player.pickupRange || pk.magnetized) {
        pk.magnetized = true;
        const dir = normalize(sub(this.player.pos, pk.pos));
        const speed = 260 + (this.player.pickupRange - d) * 2;
        pk.pos.x += dir.x * speed * dt;
        pk.pos.y += dir.y * speed * dt;
      }
      if (d < this.player.radius + pk.radius + 4) {
        this.collectPickup(pk);
        this.pickups.splice(i, 1);
      } else if (pk.age > 20) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(pk: Pickup): void {
    switch (pk.kind) {
      case 'xp_small':
      case 'xp_med':
      case 'xp_large':
        this.addXp(pk.value);
        break;
      case 'chip':
        this.chipsEarned += pk.value;
        this.callbacks.onChip();
        break;
      case 'heal':
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + pk.value);
        break;
      case 'magnet':
        for (const other of this.pickups) other.magnetized = true;
        break;
    }
  }

  addXp(amount: number): void {
    if (this.ended) return;
    this.player.xp += amount;
    if (this.player.xp >= this.player.xpToNext) {
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp(): void {
    this.player.xp -= this.player.xpToNext;
    this.player.level += 1;
    this.player.xpToNext = xpForLevel(this.player.level);
    this.paused = true;

    const pool = buildUpgradePool(this.weapons, this.passives);
    const result = rollSlotResults(pool, this.player.luck, this.rng);
    this.callbacks.onLevelUp(result);
  }

  applyUpgradeChoice(option: UpgradeOption): void {
    if (option.kind === 'weapon' && option.id) {
      const existing = this.weapons.find((w) => w.id === option.id);
      if (existing) {
        existing.level = Math.min(existing.level + 1, WEAPONS[existing.id].maxLevel);
        this.checkEvolution(existing);
      } else {
        this.weapons.push({ id: option.id as WeaponId, level: 1, timer: 0.4, evolved: false });
      }
    } else if (option.kind === 'passive' && option.id) {
      const def = PASSIVES[option.id];
      const existing = this.passives.find((p) => p.id === option.id);
      if (existing) {
        existing.level = Math.min(existing.level + 1, def.maxLevel);
      } else {
        this.passives.push({ id: option.id as PassiveId, level: 1 });
      }
      this.applyPassiveStat(def.stat, def.perLevel);
    } else if (option.kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
    } else if (option.kind === 'chips') {
      this.chipsEarned += 50;
    }

    if (this.player.xp >= this.player.xpToNext) {
      this.triggerLevelUp();
    } else {
      this.paused = false;
    }
  }

  private applyPassiveStat(stat: (typeof PASSIVES)[string]['stat'], amount: number): void {
    const p = this.player;
    switch (stat) {
      case 'luck':
        p.luck += amount;
        break;
      case 'might':
        p.might += amount;
        break;
      case 'speed':
        p.speedMult += amount / 100;
        break;
      case 'maxHp':
        p.maxHp += amount;
        p.hp += amount;
        break;
      case 'armor':
        p.armor += amount;
        break;
      case 'pickupRange':
        p.pickupRange += amount;
        break;
      case 'cooldownReduction':
        p.cooldownReductionPct += amount;
        break;
      case 'regen':
        p.regen += amount;
        break;
    }
  }

  private checkEvolution(weapon: WeaponInstance): void {
    const def = WEAPONS[weapon.id];
    if (weapon.evolved || weapon.level < def.maxLevel || !def.evolvesWith) return;
    const passive = this.passives.find((p) => p.id === def.evolvesWith);
    const passiveDef = def.evolvesWith ? PASSIVES[def.evolvesWith] : null;
    if (passive && passiveDef && passive.level >= passiveDef.maxLevel) {
      weapon.evolved = true;
      this.spawnBurst(this.player.pos, def.color, 30);
    }
  }

  damagePlayer(amount: number): void {
    if (this.player.invulnTimer > 0 || this.ended) return;
    const reduced = Math.max(1, amount - this.player.armor);
    this.player.hp -= reduced;
    this.player.invulnTimer = 0.5;
    this.screenShake = Math.max(this.screenShake, 0.5);
    this.callbacks.onPlayerHit(reduced);
  }

  private handleDeath(): void {
    if (this.player.reviveCharges > 0) {
      this.player.reviveCharges -= 1;
      this.player.hp = this.player.maxHp * 0.5;
      this.player.invulnTimer = 2;
      this.enemies.length = 0;
      this.spawnBurst(this.player.pos, '#ffd76a', 50);
      return;
    }
    this.ended = true;
    this.won = false;
    this.callbacks.onDeath();
  }

  spawnHostileBolt(enemy: Enemy): void {
    const dir = normalize(sub(this.player.pos, enemy.pos));
    this.projectiles.push({
      uid: enemyProjUid++,
      pos: { ...enemy.pos },
      vel: { x: dir.x * 210, y: dir.y * 210 },
      damage: enemy.damage,
      radius: 8,
      life: 2.5,
      maxLife: 2.5,
      pierce: 1,
      hitSet: new Set(),
      color: enemy.color,
      shape: 'enemyBolt',
      weapon: 'enemy',
      angle: 0,
      hostile: true,
    });
  }

  spawnBoss(kind: string, hpMult: number): void {
    const def = BOSSES[kind];
    if (!def) return;
    const angle = this.rng.range(0, Math.PI * 2);
    const boss: Enemy = {
      uid: enemyProjUid++,
      kind: def.kind,
      name: def.name,
      pos: { x: this.player.pos.x + Math.cos(angle) * 500, y: this.player.pos.y + Math.sin(angle) * 500 },
      vel: { x: 0, y: 0 },
      hp: Math.round(def.hp * hpMult),
      maxHp: Math.round(def.hp * hpMult),
      speed: def.speed,
      damage: def.damage,
      radius: def.radius,
      xp: def.xp,
      color: def.color,
      shape: 'star',
      hitFlash: 0,
      attackTimer: 3,
      ranged: false,
      isBoss: true,
      bossTitle: def.title,
      attackPattern: def.attackPattern,
      slowTimer: 0,
      contactCooldown: 0,
      spawnTelegraph: 1,
    };
    this.enemies.push(boss);
    this.callbacks.onBossSpawn(def.name);
  }

  bossSummonMinions(boss: Enemy, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const def = ENEMIES.coin_swarm;
      this.enemies.push({
        uid: enemyProjUid++,
        kind: def.kind,
        name: def.name,
        pos: { x: boss.pos.x + Math.cos(angle) * 60, y: boss.pos.y + Math.sin(angle) * 60 },
        vel: { x: 0, y: 0 },
        hp: def.hp,
        maxHp: def.hp,
        speed: def.speed,
        damage: def.damage,
        radius: def.radius,
        xp: def.xp,
        color: def.color,
        shape: def.shape,
        hitFlash: 0,
        attackTimer: 1,
        ranged: false,
        isBoss: false,
        slowTimer: 0,
        contactCooldown: 0,
        spawnTelegraph: 0.2,
      });
    }
  }

  bossRadialBurst(boss: Enemy, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      this.projectiles.push({
        uid: enemyProjUid++,
        pos: { ...boss.pos },
        vel: { x: Math.cos(angle) * 180, y: Math.sin(angle) * 180 },
        damage: boss.damage * 0.6,
        radius: 9,
        life: 3,
        maxLife: 3,
        pierce: 1,
        hitSet: new Set(),
        color: boss.color,
        shape: 'enemyBolt',
        weapon: 'enemy',
        angle,
        hostile: true,
      });
    }
    this.spawnBurst(boss.pos, boss.color, 16);
  }

  spawnBurst(pos: Vec2, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.particles.push({
        pos: { ...pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 3,
        gravity: 40,
        fade: true,
      });
    }
  }

  addFloatingText(pos: Vec2, text: string, color: string, size: number): void {
    this.floatingTexts.push({
      pos: { x: pos.x + (Math.random() - 0.5) * 10, y: pos.y - 10 },
      vel: { x: (Math.random() - 0.5) * 20, y: -60 },
      life: 0.6,
      maxLife: 0.6,
      text,
      color,
      size,
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vel.y += p.gravity * dt;
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.pos.x += t.vel.x * dt;
      t.pos.y += t.vel.y * dt;
      t.vel.y += 40 * dt;
      t.life -= dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  hpFraction(): number {
    return clamp(this.player.hp / this.player.maxHp, 0, 1);
  }
}
