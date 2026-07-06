import { META_UPGRADES, upgradeCost } from '../../data/metaUpgrades';
import { ACHIEVEMENTS } from '../../data/achievements';
import type { MetaUpgradeId } from '../../data/types';
import { Profile } from '../../state/Profile';
import { fetchTopScores, type LeaderboardEntry } from '../../state/Leaderboard';
import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';
import { showToast } from '../Toast';

const PROFILE_ICONS = ['🍀', '🃏', '🎩', '👻', '🎲', '💎', '🕶️', '🦊', '🐉', '👑', '🔥', '⭐'];

export class HubScreen {
  constructor(
    private profile: Profile,
    private screens: ScreenManager,
    private audio: AudioEngine,
    private onBack: () => void,
  ) {
    document.querySelector('#screen-hub [data-back]')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.onBack();
    });

    document.getElementById('hub-tabs')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (!btn) return;
      this.audio.uiClick();
      this.switchTab(btn.dataset.tab!);
    });

    document.querySelector('.leaderboard-tabs')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-lb]');
      if (!btn) return;
      this.audio.uiClick();
      document.querySelectorAll('.leaderboard-tabs .tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      this.renderLeaderboard(btn.dataset.lb === 'local');
    });

    this.wireSettings();
    this.wireProfile();
  }

  show(tab = 'upgrades'): void {
    this.switchTab(tab);
    this.screens.showMain('screen-hub');
  }

  private switchTab(tab: string): void {
    document.querySelectorAll('#hub-tabs .tab').forEach((t) => t.classList.toggle('active', (t as HTMLElement).dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => {
      (p as HTMLElement).hidden = (p as HTMLElement).dataset.panel !== tab;
    });
    if (tab === 'upgrades') this.renderUpgrades();
    else if (tab === 'achievements') this.renderAchievements();
    else if (tab === 'leaderboard') this.renderLeaderboard(false);
    else if (tab === 'profile') this.renderProfile();
    else if (tab === 'settings') this.renderSettings();
  }

  private renderUpgrades(): void {
    const grid = document.getElementById('upgrade-grid');
    const walletEl = document.getElementById('hub-chips');
    if (!grid || !walletEl) return;
    walletEl.textContent = this.profile.data.chips.toLocaleString();

    grid.innerHTML = '';
    for (const def of META_UPGRADES) {
      const level = this.profile.metaLevel(def.id);
      const maxed = level >= def.maxLevel;
      const cost = upgradeCost(def, level);
      const affordable = this.profile.data.chips >= cost;

      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-card__head">
          <span class="upgrade-card__icon">${def.icon}</span>
          <span class="upgrade-card__name">${def.name}</span>
        </div>
        <div class="upgrade-card__desc">${def.description}</div>
        <div class="upgrade-card__level">Level ${level} / ${def.maxLevel}</div>
        <div class="upgrade-card__buy ${maxed ? 'maxed' : affordable ? '' : 'disabled'}">
          ${maxed ? 'MAXED' : `🪙 ${cost}`}
        </div>
      `;
      if (!maxed) {
        card.querySelector('.upgrade-card__buy')?.addEventListener('click', () => {
          this.audio.uiClick();
          this.buyUpgrade(def.id, cost, maxed, affordable);
        });
      }
      grid.appendChild(card);
    }
  }

  private buyUpgrade(id: MetaUpgradeId, cost: number, maxed: boolean, affordable: boolean): void {
    if (maxed) return;
    if (!affordable) {
      showToast('Not enough Chips!');
      return;
    }
    if (this.profile.spendChips(cost)) {
      this.profile.setMetaLevel(id, this.profile.metaLevel(id) + 1);
      this.audio.pickupChip();
      this.renderUpgrades();
    }
  }

  private renderAchievements(): void {
    const list = document.getElementById('achievement-list');
    if (!list) return;
    list.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const unlocked = this.profile.data.achievements.includes(a.id);
      const row = document.createElement('div');
      row.className = `achievement-row ${unlocked ? '' : 'locked'}`;
      row.innerHTML = `
        <span class="achievement-row__icon">${unlocked ? a.icon : '🔒'}</span>
        <div>
          <div class="achievement-row__name">${a.name}</div>
          <div class="achievement-row__desc">${a.description}</div>
        </div>
      `;
      list.appendChild(row);
    }
  }

  private async renderLeaderboard(local: boolean): Promise<void> {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    if (local) {
      const runs = [...this.profile.data.recentRuns].sort((a, b) => b.survivedSec - a.survivedSec).slice(0, 20);
      list.innerHTML = runs.length
        ? runs
            .map(
              (r, i) => `
          <div class="leaderboard-row">
            <span class="leaderboard-row__rank">#${i + 1}</span>
            <span class="leaderboard-row__name">${r.characterId} · ${r.stageId}</span>
            <span class="leaderboard-row__score">${formatTime(r.survivedSec)} · Lv${r.level}</span>
          </div>`,
            )
            .join('')
        : '<p class="muted">No runs yet — go make some history.</p>';
      return;
    }

    list.innerHTML = '<p class="muted">Loading…</p>';
    const scores = await fetchTopScores(50);
    if (scores === null) {
      list.innerHTML = '<p class="muted">Global leaderboard is warming up. Check back soon!</p>';
      return;
    }
    if (scores.length === 0) {
      list.innerHTML = '<p class="muted">No scores yet — be the first legend.</p>';
      return;
    }
    list.innerHTML = scores.map((s: LeaderboardEntry, i: number) => {
      const isMe = s.name === this.profile.data.profileName;
      return `
        <div class="leaderboard-row ${isMe ? 'me' : ''}">
          <span class="leaderboard-row__rank">#${i + 1}</span>
          <span class="leaderboard-row__name">${escapeHtml(s.name)}</span>
          <span class="leaderboard-row__score">${s.score.toLocaleString()} pts</span>
        </div>`;
    }).join('');
  }

  private renderProfile(): void {
    const input = document.getElementById('profile-name-input') as HTMLInputElement | null;
    if (input) input.value = this.profile.data.profileName;

    const picker = document.getElementById('profile-icon-picker');
    if (picker) {
      picker.innerHTML = '';
      for (const icon of PROFILE_ICONS) {
        const btn = document.createElement('button');
        btn.textContent = icon;
        btn.className = icon === this.profile.data.profileIcon ? 'selected' : '';
        btn.addEventListener('click', () => {
          this.audio.uiClick();
          this.profile.data.profileIcon = icon;
          this.profile.save();
          this.renderProfile();
        });
        picker.appendChild(btn);
      }
    }

    const stats = this.profile.data.stats;
    const grid = document.getElementById('profile-stats');
    if (grid) {
      const tiles = [
        ['Total Runs', stats.totalRuns],
        ['Total Kills', stats.totalKills],
        ['Best Time', formatTime(stats.bestTimeSec)],
        ['Best Level', stats.bestLevel],
        ['Lifetime Chips', this.profile.data.lifetimeChips.toLocaleString()],
        ['Achievements', `${this.profile.data.achievements.length}/${ACHIEVEMENTS.length}`],
      ];
      grid.innerHTML = tiles
        .map(([label, value]) => `<div class="stat-tile"><div class="stat-tile__value">${value}</div><div class="stat-tile__label">${label}</div></div>`)
        .join('');
    }
  }

  private renderSettings(): void {
    const s = this.profile.data.settings;
    (document.getElementById('setting-music') as HTMLInputElement).value = String(Math.round(s.musicVolume * 100));
    (document.getElementById('setting-sfx') as HTMLInputElement).value = String(Math.round(s.sfxVolume * 100));
    (document.getElementById('setting-shake') as HTMLInputElement).checked = s.screenShake;
    (document.getElementById('setting-dmg') as HTMLInputElement).checked = s.showDamageNumbers;
    (document.getElementById('setting-motion') as HTMLInputElement).checked = s.reducedMotion;
    (document.getElementById('setting-cb') as HTMLInputElement).checked = s.colorblindMode;
  }

  private wireSettings(): void {
    document.getElementById('setting-music')?.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      this.profile.data.settings.musicVolume = v;
      this.profile.save();
      this.audio.setMusicVolume(v);
    });
    document.getElementById('setting-sfx')?.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      this.profile.data.settings.sfxVolume = v;
      this.profile.save();
      this.audio.setSfxVolume(v);
      this.audio.uiClick();
    });
    document.getElementById('setting-shake')?.addEventListener('change', (e) => {
      this.profile.data.settings.screenShake = (e.target as HTMLInputElement).checked;
      this.profile.save();
    });
    document.getElementById('setting-dmg')?.addEventListener('change', (e) => {
      this.profile.data.settings.showDamageNumbers = (e.target as HTMLInputElement).checked;
      this.profile.save();
    });
    document.getElementById('setting-motion')?.addEventListener('change', (e) => {
      this.profile.data.settings.reducedMotion = (e.target as HTMLInputElement).checked;
      this.profile.save();
      document.documentElement.classList.toggle('reduced-motion', (e.target as HTMLInputElement).checked);
    });
    document.getElementById('setting-cb')?.addEventListener('change', (e) => {
      this.profile.data.settings.colorblindMode = (e.target as HTMLInputElement).checked;
      this.profile.save();
      document.documentElement.classList.toggle('colorblind', (e.target as HTMLInputElement).checked);
    });
    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      if (confirm('This wipes all progress, Chips, and unlocks. Are you sure?')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  private wireProfile(): void {
    document.getElementById('profile-name-input')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      this.profile.data.profileName = val || 'Player';
      this.profile.save();
      showToast('Name saved!');
    });
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
