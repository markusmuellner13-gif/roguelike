import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';
import type { SlotResult, UpgradeOption } from '../../systems/Upgrades';
import { showToast } from '../Toast';

const FILLER_ICONS = ['🍒', '🔔', '💰', '⭐', '7️⃣', '🍋', '🍀', '🎲'];

export class LevelUpModal {
  private busy = false;

  constructor(
    private screens: ScreenManager,
    private audio: AudioEngine,
    private onChoose: (option: UpgradeOption) => void,
  ) {}

  present(result: SlotResult): void {
    this.busy = true;
    this.screens.show('screen-levelup');
    const title = document.getElementById('levelup-title');
    if (title) title.textContent = 'LEVEL UP!';
    this.audio.levelUp();

    const choicesEl = document.getElementById('slot-choices');
    if (choicesEl) choicesEl.hidden = true;

    const reels = Array.from(document.querySelectorAll<HTMLElement>('.slot-reel'));
    reels.forEach((r) => r.classList.remove('jackpot', 'matched'));

    const durations = [700, 1000, 1350];
    let doneCount = 0;
    reels.forEach((reelEl, i) => {
      this.spinReel(reelEl, result.options[i].icon, durations[i], () => {
        doneCount += 1;
        if (doneCount === reels.length) this.onAllStopped(result, reels);
      });
    });
  }

  private spinReel(reelEl: HTMLElement, finalIcon: string, duration: number, onDone: () => void): void {
    const strip = reelEl.querySelector('.slot-reel__strip');
    if (!strip) return;
    reelEl.classList.add('spinning');
    const interval = window.setInterval(() => {
      const icon = FILLER_ICONS[Math.floor(Math.random() * FILLER_ICONS.length)];
      strip.innerHTML = `<div class="slot-reel__symbol">${icon}</div>`;
    }, 70);
    window.setTimeout(() => {
      clearInterval(interval);
      reelEl.classList.remove('spinning');
      strip.innerHTML = `<div class="slot-reel__symbol">${finalIcon}</div>`;
      onDone();
    }, duration);
  }

  private onAllStopped(result: SlotResult, reels: HTMLElement[]): void {
    if (result.jackpot) {
      reels.forEach((r) => r.classList.add('jackpot'));
      this.audio.jackpot();
      showToast('🎰 JACKPOT! Triple match!');
    } else if (result.matched) {
      this.audio.crit();
    }

    const choicesEl = document.getElementById('slot-choices');
    if (!choicesEl) return;
    choicesEl.hidden = false;
    choicesEl.innerHTML = '';
    result.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = `slot-choice ${opt.isNew ? 'new' : ''}`;
      btn.innerHTML = `
        <span class="slot-choice__icon">${opt.icon}</span>
        <span>
          <div class="slot-choice__name">${opt.label}</div>
          <div class="slot-choice__desc">${opt.description}</div>
        </span>
      `;
      btn.addEventListener('click', () => {
        if (!this.busy) return;
        this.busy = false;
        this.audio.uiClick();
        this.screens.hide('screen-levelup');
        this.onChoose(result.options[i]);
      });
      choicesEl.appendChild(btn);
    });
  }
}
