import type { CharacterDef } from '../data/types';
import type { Player } from '../entities/types';
import type { Profile } from '../state/Profile';

/** Builds a fresh run-start Player from a character definition plus
 * permanent meta-upgrade bonuses purchased in the hub. */
export function createPlayer(character: CharacterDef, profile: Profile): Player {
  const might = profile.metaLevel('chip_stack') * 5;
  const hpBonus = profile.metaLevel('iron_liver') * 8;
  const speedBonus = profile.metaLevel('quick_feet') * 0.02;
  const critBonus = profile.metaLevel('sharp_eye') * 0.03;
  const regenBonus = profile.metaLevel('second_wind') * 0.2;
  const magnetBonus = profile.metaLevel('magnetism') * 0.15;
  const luckBonus = profile.metaLevel('gambler_luck') * 4;
  const reviveCharges = profile.metaLevel('extra_life');

  const maxHp = character.baseStats.maxHp + hpBonus;

  return {
    pos: { x: 0, y: 0 },
    radius: 14,
    hp: maxHp,
    maxHp,
    level: 1 + profile.metaLevel('starting_capital'),
    xp: 0,
    xpToNext: xpForLevel(1),
    might: character.baseStats.might + might,
    speedMult: 1 + speedBonus,
    luck: character.baseStats.luck + luckBonus,
    armor: 0,
    pickupRange: 90 * (1 + magnetBonus),
    cooldownReductionPct: 0,
    regen: regenBonus,
    critChance: 0.05 + critBonus,
    invulnTimer: 0,
    facing: 0,
    reviveCharges,
    color: character.color,
    icon: character.icon,
  };
}

export function xpForLevel(level: number): number {
  return Math.round(8 + level * 6 + Math.pow(level, 1.55) * 1.6);
}

export function damageMultiplierFromMight(might: number): number {
  return 1 + might / 100;
}

export function effectiveCooldownReduction(cooldownReductionPct: number): number {
  return Math.min(Math.max(cooldownReductionPct, 0), 70) / 100;
}
