import type { MetaUpgradeDef } from './types';

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'chip_stack', name: 'Chip Stack', icon: '🪙', description: '+5 starting might per level.', maxLevel: 8, baseCost: 50, costGrowth: 1.35 },
  { id: 'iron_liver', name: 'Iron Liver', icon: '🛡️', description: '+8 max HP per level.', maxLevel: 8, baseCost: 50, costGrowth: 1.35 },
  { id: 'quick_feet', name: 'Quick Feet', icon: '👟', description: '+2% move speed per level.', maxLevel: 8, baseCost: 60, costGrowth: 1.35 },
  { id: 'sharp_eye', name: 'Sharp Eye', icon: '👁️', description: '+3% crit chance per level.', maxLevel: 6, baseCost: 90, costGrowth: 1.4 },
  { id: 'fat_wallet', name: 'Fat Wallet', icon: '💰', description: '+5% Chips earned per run per level.', maxLevel: 10, baseCost: 80, costGrowth: 1.3 },
  { id: 'second_wind', name: 'Second Wind', icon: '💨', description: '+0.2 HP/s regen per level.', maxLevel: 5, baseCost: 120, costGrowth: 1.45 },
  { id: 'magnetism', name: 'Magnetism', icon: '🧲', description: '+15% pickup range per level.', maxLevel: 5, baseCost: 40, costGrowth: 1.3 },
  { id: 'gambler_luck', name: "Gambler's Luck", icon: '🍀', description: '+4 luck per level: better slot odds.', maxLevel: 6, baseCost: 100, costGrowth: 1.4 },
  { id: 'starting_capital', name: 'Starting Capital', icon: '🏦', description: 'Begin every run 1 level higher, per level.', maxLevel: 3, baseCost: 300, costGrowth: 1.8 },
  { id: 'extra_life', name: 'Extra Life', icon: '❤️', description: 'Revive once per run with 50% HP, per level.', maxLevel: 2, baseCost: 500, costGrowth: 2.2 },
];

export function upgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}
