import type { StageDef } from './types';

export const STAGES: StageDef[] = [
  {
    id: 'casino_floor',
    name: 'The Casino Floor',
    description: 'Neon carpets and clinking chips. Where every run begins.',
    bgColorA: '#1a1030',
    bgColorB: '#100a1f',
    accentColor: '#7fe8ff',
    durationSec: 900,
    enemyPool: ['chip_scuttler', 'card_slicer', 'die_roller', 'coin_swarm', 'wild_joker', 'high_stakes_hound'],
    boss: 'the_house',
  },
  {
    id: 'high_roller_lounge',
    name: 'High-Roller Lounge',
    description: 'Velvet ropes hide something hungrier than debt.',
    bgColorA: '#2b0f2e',
    bgColorB: '#160a1c',
    accentColor: '#ff6ad5',
    durationSec: 900,
    enemyPool: ['card_slicer', 'wild_joker', 'roulette_wraith', 'ghost_dealer', 'neon_wisp', 'debt_collector'],
    boss: 'jackpot_wyrm',
  },
  {
    id: 'the_vault',
    name: 'The Vault',
    description: 'Beyond the steel door, the House keeps its real secrets.',
    bgColorA: '#0f1c2b',
    bgColorB: '#080e16',
    accentColor: '#ffd76a',
    durationSec: 1200,
    enemyPool: ['slot_sentinel', 'vault_golem', 'ghost_dealer', 'debt_collector', 'roulette_wraith', 'wild_joker'],
    boss: 'the_dealer',
  },
];
