import { CHARACTERS } from '../../data/characters';
import { STAGES } from '../../data/stages';
import type { Profile } from '../../state/Profile';
import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';
import { showToast } from '../Toast';

export interface CharacterSelectCallbacks {
  onBack: () => void;
  onStart: (characterId: string, stageId: string) => void;
}

export class CharacterSelectScreen {
  private selectedChar = 'lucky_lou';
  private selectedStage = STAGES[0].id;

  constructor(
    private profile: Profile,
    private screens: ScreenManager,
    private audio: AudioEngine,
    private callbacks: CharacterSelectCallbacks,
  ) {
    document.querySelector('#screen-select [data-back]')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onBack();
    });
    document.getElementById('btn-start-run')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onStart(this.selectedChar, this.selectedStage);
    });
  }

  show(): void {
    this.render();
    this.screens.showMain('screen-select');
  }

  private render(): void {
    const charGrid = document.getElementById('char-grid');
    const stageGrid = document.getElementById('stage-grid');
    if (!charGrid || !stageGrid) return;

    charGrid.innerHTML = '';
    for (const c of CHARACTERS) {
      const unlocked = this.profile.data.unlockedCharacters.includes(c.id);
      const card = document.createElement('button');
      card.className = `char-card ${c.id === this.selectedChar ? 'selected' : ''} ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="char-card__icon">${c.icon}</div>
        <div class="char-card__name">${c.name}</div>
        <div class="char-card__title">${c.title}</div>
        <div class="char-card__perk">${c.perk}</div>
        ${unlocked ? '' : `<div class="char-card__cost">🪙 ${c.unlockCost}</div>`}
      `;
      card.addEventListener('click', () => {
        if (unlocked) {
          this.audio.uiClick();
          this.selectedChar = c.id;
          this.render();
        } else if (this.profile.spendChips(c.unlockCost)) {
          this.profile.unlockCharacter(c.id);
          this.audio.jackpot();
          showToast(`Unlocked ${c.name}!`);
          this.selectedChar = c.id;
          this.render();
        } else {
          this.audio.uiClick();
          showToast('Not enough Chips — earn more by surviving runs!');
        }
      });
      charGrid.appendChild(card);
    }

    stageGrid.innerHTML = '';
    for (const s of STAGES) {
      const card = document.createElement('button');
      card.className = `stage-card ${s.id === this.selectedStage ? 'selected' : ''}`;
      card.style.background = `linear-gradient(135deg, ${s.bgColorA}, ${s.bgColorB})`;
      card.innerHTML = `<div class="stage-card__name">${s.name}</div><div class="stage-card__desc">${s.description}</div>`;
      card.addEventListener('click', () => {
        this.audio.uiClick();
        this.selectedStage = s.id;
        this.render();
      });
      stageGrid.appendChild(card);
    }
  }
}
