import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';
import type { Profile } from '../../state/Profile';
import { submitScore } from '../../state/Leaderboard';
import { showToast } from '../Toast';

export interface RunSummary {
  characterName: string;
  stageName: string;
  stageId: string;
  characterId: string;
  survivedSec: number;
  level: number;
  kills: number;
  chipsEarned: number;
  won: boolean;
}

export interface GameOverCallbacks {
  onRetry: () => void;
  onMainMenu: () => void;
}

export class GameOverScreen {
  constructor(
    private screens: ScreenManager,
    private audio: AudioEngine,
    private profile: Profile,
    private callbacks: GameOverCallbacks,
  ) {
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.screens.hide('screen-gameover');
      this.callbacks.onRetry();
    });
    document.getElementById('btn-result-menu')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.screens.hide('screen-gameover');
      this.callbacks.onMainMenu();
    });
    document.getElementById('btn-share')?.addEventListener('click', () => this.share());
  }

  private lastSummary: RunSummary | null = null;

  present(summary: RunSummary): void {
    this.lastSummary = summary;
    this.audio.stopMusic();
    this.audio[summary.won ? 'victory' : 'playerDeath']();

    const title = document.getElementById('result-title');
    if (title) title.textContent = summary.won ? 'YOU BEAT THE HOUSE!' : 'You Went Bust';
    const subtitle = document.getElementById('result-subtitle');
    if (subtitle) subtitle.textContent = `${summary.characterName} · ${summary.stageName}`;

    const stats = document.getElementById('result-stats');
    if (stats) {
      const tiles: [string, string | number][] = [
        ['Survived', formatTime(summary.survivedSec)],
        ['Level Reached', summary.level],
        ['Enemies Slain', summary.kills],
        ['Chips Earned', summary.chipsEarned],
      ];
      stats.innerHTML = tiles
        .map(([label, value]) => `<div class="stat-tile"><div class="stat-tile__value">${value}</div><div class="stat-tile__label">${label}</div></div>`)
        .join('');
    }

    const score = Math.round(summary.survivedSec * 10 + summary.level * 50 + summary.kills * 2 + (summary.won ? 1000 : 0));
    void submitScore({
      name: this.profile.data.profileName,
      score,
      character: summary.characterId,
      stage: summary.stageId,
      level: summary.level,
    });

    this.screens.show('screen-gameover');
  }

  private async share(): Promise<void> {
    const s = this.lastSummary;
    if (!s) return;
    this.audio.uiClick();
    const text = `I survived ${formatTime(s.survivedSec)} in REELBONK and hit Level ${s.level} 🎰🔥 Beat that:`;
    const url = location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reelbonk', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast('Copied to clipboard!');
      }
    } catch {
      // User cancelled the share sheet — not an error worth surfacing.
    }
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
