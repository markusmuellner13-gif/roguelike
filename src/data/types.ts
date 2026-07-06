export type WeaponId =
  | 'lucky_dice'
  | 'chip_shooter'
  | 'card_fan'
  | 'roulette_orbit'
  | 'slot_beam'
  | 'coin_storm'
  | 'neon_whip'
  | 'jackpot_bomb';

export type PassiveId =
  | 'four_leaf'
  | 'loaded_dice'
  | 'velvet_gloves'
  | 'vip_pass'
  | 'house_edge'
  | 'lucky_horseshoe'
  | 'card_counter'
  | 'high_roller';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  /** Base cooldown in seconds at level 1. */
  baseCooldown: number;
  baseDamage: number;
  color: string;
  evolvesWith?: PassiveId;
  evolvesInto?: string;
}

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  stat: 'might' | 'speed' | 'maxHp' | 'armor' | 'luck' | 'pickupRange' | 'cooldownReduction' | 'regen';
  perLevel: number;
}

export type EnemyKind =
  | 'chip_scuttler'
  | 'card_slicer'
  | 'die_roller'
  | 'coin_swarm'
  | 'wild_joker'
  | 'roulette_wraith'
  | 'slot_sentinel'
  | 'high_stakes_hound'
  | 'vault_golem'
  | 'ghost_dealer'
  | 'neon_wisp'
  | 'debt_collector';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  color: string;
  shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'star';
  ranged?: boolean;
  isMinion?: boolean;
}

export interface BossDef {
  kind: string;
  name: string;
  title: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  color: string;
  attackPattern: 'burst' | 'sweep' | 'summon' | 'chase';
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: string;
  startingWeapon: WeaponId;
  baseStats: {
    maxHp: number;
    speed: number;
    might: number;
    luck: number;
  };
  perk: string;
  unlockCost: number;
  unlockedByDefault: boolean;
}

export interface StageDef {
  id: string;
  name: string;
  description: string;
  bgColorA: string;
  bgColorB: string;
  accentColor: string;
  durationSec: number;
  enemyPool: EnemyKind[];
  boss: string;
}

export type MetaUpgradeId =
  | 'chip_stack'
  | 'iron_liver'
  | 'quick_feet'
  | 'sharp_eye'
  | 'fat_wallet'
  | 'second_wind'
  | 'magnetism'
  | 'gambler_luck'
  | 'starting_capital'
  | 'extra_life';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}
