import type { Vec2 } from '../core/Vec2';
import type { EnemyKind, PassiveId, WeaponId } from '../data/types';

export interface Player {
  pos: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  might: number;
  speedMult: number;
  luck: number;
  armor: number;
  pickupRange: number;
  cooldownReductionPct: number;
  regen: number;
  critChance: number;
  invulnTimer: number;
  facing: number;
  reviveCharges: number;
  color: string;
  icon: string;
}

export interface WeaponInstance {
  id: WeaponId;
  level: number;
  timer: number;
  evolved: boolean;
}

export interface PassiveInstance {
  id: PassiveId;
  level: number;
}

export interface Enemy {
  uid: number;
  kind: EnemyKind | string;
  name: string;
  pos: Vec2;
  vel: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  color: string;
  shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'star';
  hitFlash: number;
  attackTimer: number;
  ranged: boolean;
  isBoss: boolean;
  bossTitle?: string;
  attackPattern?: 'burst' | 'sweep' | 'summon' | 'chase';
  slowTimer: number;
  contactCooldown: number;
  spawnTelegraph: number;
}

export type ProjectileShape = 'chip' | 'die' | 'card' | 'beam' | 'coin' | 'whip' | 'bomb' | 'orbit' | 'enemyBolt';

export interface Projectile {
  uid: number;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  radius: number;
  life: number;
  maxLife: number;
  pierce: number;
  hitSet: Set<number>;
  color: string;
  shape: ProjectileShape;
  weapon: WeaponId | 'enemy';
  angle: number;
  orbitAngle?: number;
  orbitRadius?: number;
  crit?: boolean;
  hostile?: boolean;
  explodeRadius?: number;
  lastHit?: Map<number, number>;
}

export type PickupKind = 'xp_small' | 'xp_med' | 'xp_large' | 'chip' | 'heal' | 'magnet';

export interface Pickup {
  uid: number;
  kind: PickupKind;
  pos: Vec2;
  vel: Vec2;
  value: number;
  radius: number;
  age: number;
  magnetized: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
  fade: boolean;
}

export interface FloatingText {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}
