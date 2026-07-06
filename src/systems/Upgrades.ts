import { WEAPON_LIST } from '../data/weapons';
import { PASSIVE_LIST } from '../data/passives';
import type { PassiveId, WeaponId } from '../data/types';
import type { Rng } from '../core/Random';
import type { PassiveInstance, WeaponInstance } from '../entities/types';

export interface UpgradeOption {
  kind: 'weapon' | 'passive' | 'heal' | 'chips';
  id?: WeaponId | PassiveId;
  isNew: boolean;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const MAX_SLOTS = 6;

export function buildUpgradePool(weapons: WeaponInstance[], passives: PassiveInstance[]): UpgradeOption[] {
  const pool: UpgradeOption[] = [];
  const ownedWeapons = new Map(weapons.map((w) => [w.id, w]));
  const ownedPassives = new Map(passives.map((p) => [p.id, p]));

  for (const def of WEAPON_LIST) {
    const owned = ownedWeapons.get(def.id);
    if (owned) {
      if (owned.level < def.maxLevel) {
        pool.push({
          kind: 'weapon',
          id: def.id,
          isNew: false,
          label: `${def.name} +1`,
          icon: def.icon,
          description: `Level ${owned.level + 1}: ${def.description}`,
          color: def.color,
        });
      }
    } else if (weapons.length < MAX_SLOTS) {
      pool.push({
        kind: 'weapon',
        id: def.id,
        isNew: true,
        label: def.name,
        icon: def.icon,
        description: def.description,
        color: def.color,
      });
    }
  }

  for (const def of PASSIVE_LIST) {
    const owned = ownedPassives.get(def.id);
    if (owned) {
      if (owned.level < def.maxLevel) {
        pool.push({
          kind: 'passive',
          id: def.id,
          isNew: false,
          label: `${def.name} +1`,
          icon: def.icon,
          description: `Level ${owned.level + 1}: ${def.description}`,
          color: '#ffd76a',
        });
      }
    } else if (passives.length < MAX_SLOTS) {
      pool.push({
        kind: 'passive',
        id: def.id,
        isNew: true,
        label: def.name,
        icon: def.icon,
        description: def.description,
        color: '#ffd76a',
      });
    }
  }

  if (pool.length === 0) {
    pool.push(
      { kind: 'heal', isNew: false, label: 'Free Drink', icon: '🍹', description: 'Restore 30% HP.', color: '#7fe8ff' },
      { kind: 'chips', isNew: false, label: 'Side Bet', icon: '💵', description: '+50 bonus Chips.', color: '#ffd76a' },
    );
  }

  return pool;
}

export interface SlotResult {
  options: UpgradeOption[];
  matched: boolean;
  jackpot: boolean;
}

/** Generates three slot-reel results. Higher luck raises the chance
 * reels line up — a duplicate ("Double Up") or full jackpot triple. */
export function rollSlotResults(pool: UpgradeOption[], luck: number, rng: Rng): SlotResult {
  const a = rng.pick(pool);
  const matchChance = Math.min(0.08 + Math.max(luck, 0) * 0.004, 0.42);
  const jackpotChance = Math.min(0.02 + Math.max(luck, 0) * 0.002, 0.2);

  let b = rng.chance(matchChance) ? a : rng.pick(pool);
  let c: UpgradeOption;
  if (b === a && rng.chance(jackpotChance / matchChance)) {
    c = a;
  } else {
    c = rng.chance(matchChance * 0.5) ? a : rng.pick(pool);
  }

  const options = [a, b, c];
  const matched = a === b || b === c || a === c;
  const jackpot = a === b && b === c;
  return { options, matched, jackpot };
}
