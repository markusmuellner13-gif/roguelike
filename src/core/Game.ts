import { Viewport } from './Viewport';
import { InputManager } from './Input';
import { GameLoop } from './Loop';
import { AudioEngine } from '../audio/AudioEngine';
import { Profile } from '../state/Profile';
import { Simulation } from '../systems/Simulation';
import { Renderer } from '../render/Renderer';
import { ScreenManager } from '../ui/ScreenManager';
import { MainMenu } from '../ui/screens/MainMenu';
import { CharacterSelectScreen } from '../ui/screens/CharacterSelect';
import { HubScreen } from '../ui/screens/Hub';
import { PauseMenu } from '../ui/screens/PauseMenu';
import { LevelUpModal } from '../ui/screens/LevelUpModal';
import { GameOverScreen } from '../ui/screens/GameOverScreen';
import { showHud, hideHud, updateHud } from '../ui/HUD';
import { showToast } from '../ui/Toast';
import { CHARACTERS } from '../data/characters';
import { STAGES } from '../data/stages';
import { todaySeed } from './Random';
import { ACHIEVEMENTS } from '../data/achievements';

export class Game {
  private profile = new Profile();
  private audio = new AudioEngine();
  private screens = new ScreenManager();
  private viewport: Viewport;
  private input: InputManager;
  private renderer: Renderer;
  private loop: GameLoop;

  private mainMenu: MainMenu;
  private charSelect: CharacterSelectScreen;
  private hub: HubScreen;
  private pauseMenu: PauseMenu;
  private levelUpModal: LevelUpModal;
  private gameOver: GameOverScreen;

  private sim: Simulation | null = null;
  private uiPaused = false;
  private lastRunConfig: { characterId: string; stageId: string; daily: boolean } | null = null;
  private hubReturnTarget: 'menu' | 'pause' = 'menu';

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.viewport = new Viewport(canvas);
    this.input = new InputManager(
      document.getElementById('touch-layer')!,
      document.getElementById('joystick-base')!,
      document.getElementById('joystick-thumb')!,
    );
    this.renderer = new Renderer(this.viewport);
    this.loop = new GameLoop(this.update, this.render);

    this.audio.setMusicVolume(this.profile.data.settings.musicVolume);
    this.audio.setSfxVolume(this.profile.data.settings.sfxVolume);
    document.documentElement.classList.toggle('reduced-motion', this.profile.data.settings.reducedMotion);
    document.documentElement.classList.toggle('colorblind', this.profile.data.settings.colorblindMode);

    this.mainMenu = new MainMenu(this.profile, this.screens, this.audio, {
      onPlay: (daily) => this.openCharacterSelect(daily),
      onOpenHub: (tab) => {
        this.hubReturnTarget = 'menu';
        this.hub.show(tab);
      },
    });

    this.charSelect = new CharacterSelectScreen(this.profile, this.screens, this.audio, {
      onBack: () => this.mainMenu.show(),
      onStart: (characterId, stageId) => this.startRun(characterId, stageId, this.pendingDaily),
    });

    this.hub = new HubScreen(this.profile, this.screens, this.audio, () => this.handleHubBack());

    this.pauseMenu = new PauseMenu(this.screens, this.audio, {
      onResume: () => {
        this.uiPaused = false;
      },
      onSettings: () => {
        this.hubReturnTarget = 'pause';
        this.pauseMenu.close();
        this.hub.show('settings');
      },
      onQuit: () => this.quitToMenu(),
    });

    this.levelUpModal = new LevelUpModal(this.screens, this.audio, (option) => {
      this.sim?.applyUpgradeChoice(option);
    });

    this.gameOver = new GameOverScreen(this.screens, this.audio, this.profile, {
      onRetry: () => {
        if (this.lastRunConfig) this.startRun(this.lastRunConfig.characterId, this.lastRunConfig.stageId, this.lastRunConfig.daily);
      },
      onMainMenu: () => this.quitToMenu(),
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => this.pauseGame());

    this.wireBoot();
    this.loop.start();
  }

  private handleHubBack(): void {
    if (this.hubReturnTarget === 'pause') {
      this.screens.hide('screen-hub');
      this.pauseMenu.open();
    } else {
      this.mainMenu.show();
    }
  }

  private pauseGame(): void {
    if (!this.sim || this.uiPaused || !this.screens.isHidden('screen-levelup')) return;
    this.uiPaused = true;
    this.pauseMenu.open();
  }

  private pendingDaily = false;

  private openCharacterSelect(daily: boolean): void {
    this.pendingDaily = daily;
    this.charSelect.show();
  }

  private wireBoot(): void {
    const fill = document.getElementById('boot-bar-fill');
    const hint = document.getElementById('boot-hint');
    const startBtn = document.getElementById('btn-boot-start');
    let progress = 0;
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 8 + Math.random() * 10);
      if (fill) fill.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(timer);
        if (hint) hint.textContent = 'Ready when you are.';
        if (startBtn) startBtn.hidden = false;
      }
    }, 90);

    startBtn?.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.uiClick();
      this.screens.hide('screen-boot');
      this.mainMenu.show();
    });
  }

  private startRun(characterId: string, stageId: string, daily: boolean): void {
    const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
    const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    const seed = daily ? todaySeed() : `${Date.now()}-${Math.random()}`;
    this.lastRunConfig = { characterId, stageId, daily };

    this.sim = new Simulation(character, stage, this.profile, seed, {
      onLevelUp: (result) => this.levelUpModal.present(result),
      onDeath: () => this.endRun(character.name, stage, false),
      onVictory: () => this.endRun(character.name, stage, true),
      onKill: (enemy) => this.checkKillAchievements(enemy),
      onPlayerHit: () => {
        if (this.profile.data.settings.screenShake) this.audio.playerHurt();
      },
      onChip: () => this.audio.pickupChip(),
      onBossSpawn: (name) => {
        this.audio.bossSpawn();
        showToast(`⚠️ ${name} has entered the floor!`);
      },
      onBossDown: (name) => {
        showToast(`💥 ${name} defeated!`);
        this.unlockAchievement('boss_slain');
      },
    });

    document.querySelectorAll('.screen').forEach((s) => {
      if (s.id !== 'screen-boot') (s as HTMLElement).hidden = true;
    });
    showHud();
    this.uiPaused = false;
    this.audio.startMusic();
  }

  private checkKillAchievements(enemy: { xp: number }): void {
    this.unlockAchievement('first_blood');
    if (this.sim && this.sim.player.level >= 20) this.unlockAchievement('level_20');
    if (this.sim && this.sim.weapons.length >= 6) this.unlockAchievement('all_weapons');
    if (this.sim && this.sim.weapons.some((w) => w.evolved)) this.unlockAchievement('max_weapon');
    void enemy;
  }

  private unlockAchievement(id: string): void {
    if (this.profile.unlockAchievement(id)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) showToast(`🏆 Achievement: ${def.name}`);
    }
  }

  private endRun(characterName: string, stage: { id: string; name: string }, won: boolean): void {
    if (!this.sim) return;
    const sim = this.sim;
    hideHud();
    this.audio.stopMusic();

    const chipsBonus = Math.round(sim.chipsEarned * (1 + this.profile.metaLevel('fat_wallet') * 0.05));
    this.profile.addChips(chipsBonus);
    this.profile.recordRun({
      characterId: this.lastRunConfig?.characterId ?? '',
      stageId: stage.id,
      survivedSec: sim.elapsed,
      level: sim.player.level,
      kills: sim.kills,
      chipsEarned: chipsBonus,
      won,
      date: new Date().toISOString(),
    });

    if (sim.elapsed >= 300) this.unlockAchievement('survive_5');
    if (sim.elapsed >= 900) this.unlockAchievement('survive_15');
    if (this.profile.data.unlockedCharacters.length >= CHARACTERS.length) this.unlockAchievement('unlock_all_chars');
    if (this.profile.data.lifetimeChips >= 10000) this.unlockAchievement('rich');
    if (this.lastRunConfig?.daily) this.unlockAchievement('daily_win');

    this.gameOver.present({
      characterName,
      stageName: stage.name,
      stageId: stage.id,
      characterId: this.lastRunConfig?.characterId ?? '',
      survivedSec: sim.elapsed,
      level: sim.player.level,
      kills: sim.kills,
      chipsEarned: chipsBonus,
      won,
    });

    this.sim = null;
  }

  private quitToMenu(): void {
    this.sim = null;
    this.uiPaused = false;
    hideHud();
    this.audio.stopMusic();
    this.pauseMenu.close();
    this.mainMenu.show();
  }

  private update = (dt: number): void => {
    if (!this.sim) return;
    this.input.update();
    if (this.input.pausePressed) this.pauseGame();
    if (this.uiPaused) return;

    this.sim.moveInput = this.input.move;
    this.sim.update(dt);
    updateHud(this.sim, this.currentStageName());
  };

  private currentStageName(): string {
    const stage = STAGES.find((s) => s.id === this.lastRunConfig?.stageId);
    return stage?.name ?? '';
  }

  private render = (): void => {
    if (!this.sim) return;
    const stage = STAGES.find((s) => s.id === this.lastRunConfig?.stageId) ?? STAGES[0];
    this.renderer.render(this.sim, stage);
  };
}
