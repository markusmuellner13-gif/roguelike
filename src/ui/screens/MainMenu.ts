import type { Profile } from '../../state/Profile';
import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';

export interface MainMenuCallbacks {
  onPlay: (daily: boolean) => void;
  onOpenHub: (tab?: string) => void;
}

export class MainMenu {
  constructor(
    private profile: Profile,
    private screens: ScreenManager,
    private audio: AudioEngine,
    private callbacks: MainMenuCallbacks,
  ) {
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onPlay(false);
    });
    document.getElementById('btn-daily')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onPlay(true);
    });
    document.getElementById('btn-hub')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onOpenHub();
    });
    document.getElementById('btn-open-profile')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onOpenHub('profile');
    });
  }

  refresh(): void {
    const nameEl = document.getElementById('menu-profile-name');
    const chipsEl = document.getElementById('menu-chips');
    if (nameEl) nameEl.textContent = this.profile.data.profileName;
    if (chipsEl) chipsEl.textContent = this.profile.data.chips.toLocaleString();
  }

  show(): void {
    this.refresh();
    this.screens.showMain('screen-menu');
  }
}
