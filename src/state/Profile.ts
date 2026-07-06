import { loadJSON, saveJSON } from '../core/Storage';
import type { MetaUpgradeId } from '../data/types';

export interface RunResult {
  characterId: string;
  stageId: string;
  survivedSec: number;
  level: number;
  kills: number;
  chipsEarned: number;
  won: boolean;
  date: string;
}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
  colorblindMode: boolean;
  reducedMotion: boolean;
}

export interface ProfileData {
  version: 2;
  profileName: string;
  profileIcon: string;
  chips: number;
  lifetimeChips: number;
  unlockedCharacters: string[];
  metaUpgradeLevels: Partial<Record<MetaUpgradeId, number>>;
  achievements: string[];
  recentRuns: RunResult[];
  bestBySt: Record<string, RunResult>;
  stats: {
    totalRuns: number;
    totalKills: number;
    bestTimeSec: number;
    bestLevel: number;
    totalPlaytimeSec: number;
    dailyStreak: number;
    lastDailyDate: string;
  };
  settings: Settings;
}

const DEFAULT_PROFILE: ProfileData = {
  version: 2,
  profileName: 'Player',
  profileIcon: '🍀',
  chips: 0,
  lifetimeChips: 0,
  unlockedCharacters: ['lucky_lou'],
  metaUpgradeLevels: {},
  achievements: [],
  recentRuns: [],
  bestBySt: {},
  stats: {
    totalRuns: 0,
    totalKills: 0,
    bestTimeSec: 0,
    bestLevel: 0,
    totalPlaytimeSec: 0,
    dailyStreak: 0,
    lastDailyDate: '',
  },
  settings: {
    musicVolume: 0.6,
    sfxVolume: 0.8,
    screenShake: true,
    showDamageNumbers: true,
    colorblindMode: false,
    reducedMotion: false,
  },
};

const KEY = 'profile';

export class Profile {
  data: ProfileData;

  constructor() {
    this.data = loadJSON<ProfileData>(KEY, structuredClone(DEFAULT_PROFILE));
  }

  save(): void {
    saveJSON(KEY, this.data);
  }

  addChips(amount: number): void {
    this.data.chips += amount;
    this.data.lifetimeChips += amount;
    this.save();
  }

  spendChips(amount: number): boolean {
    if (this.data.chips < amount) return false;
    this.data.chips -= amount;
    this.save();
    return true;
  }

  metaLevel(id: MetaUpgradeId): number {
    return this.data.metaUpgradeLevels[id] ?? 0;
  }

  setMetaLevel(id: MetaUpgradeId, level: number): void {
    this.data.metaUpgradeLevels[id] = level;
    this.save();
  }

  unlockCharacter(id: string): void {
    if (!this.data.unlockedCharacters.includes(id)) {
      this.data.unlockedCharacters.push(id);
      this.save();
    }
  }

  unlockAchievement(id: string): boolean {
    if (this.data.achievements.includes(id)) return false;
    this.data.achievements.push(id);
    this.save();
    return true;
  }

  recordRun(result: RunResult): void {
    this.data.recentRuns.unshift(result);
    this.data.recentRuns = this.data.recentRuns.slice(0, 20);
    const prevBest = this.data.bestBySt[result.stageId];
    if (!prevBest || result.survivedSec > prevBest.survivedSec) {
      this.data.bestBySt[result.stageId] = result;
    }
    this.data.stats.totalRuns += 1;
    this.data.stats.totalKills += result.kills;
    this.data.stats.bestTimeSec = Math.max(this.data.stats.bestTimeSec, result.survivedSec);
    this.data.stats.bestLevel = Math.max(this.data.stats.bestLevel, result.level);
    this.data.stats.totalPlaytimeSec += result.survivedSec;
    this.save();
  }
}
