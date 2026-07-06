import type { ScreenManager } from '../ScreenManager';
import type { AudioEngine } from '../../audio/AudioEngine';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export class PauseMenu {
  constructor(
    private screens: ScreenManager,
    private audio: AudioEngine,
    private callbacks: PauseMenuCallbacks,
  ) {
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.close();
      this.callbacks.onResume();
    });
    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.callbacks.onSettings();
    });
    document.getElementById('btn-quit-run')?.addEventListener('click', () => {
      this.audio.uiClick();
      this.close();
      this.callbacks.onQuit();
    });
  }

  open(): void {
    this.audio.uiClick();
    this.screens.show('screen-pause');
  }

  close(): void {
    this.screens.hide('screen-pause');
  }
}
