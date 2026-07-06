/**
 * Every sound is synthesized with the WebAudio oscillator/noise graph —
 * no audio files to fetch, so the game is playable the instant the JS
 * bundle loads (critical for a link that needs to go viral: zero
 * buffering, works offline, tiny bundle).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  musicVolume = 0.6;
  sfxVolume = 0.8;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Must be called from a user gesture to satisfy autoplay policy. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : v;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : v;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.musicGain) this.musicGain.gain.value = muted ? 0 : this.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = muted ? 0 : this.sfxVolume;
  }

  private tone(freq: number, duration: number, type: OscillatorType, gainStart = 0.25, target = this.sfxGain): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(target ?? ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(duration: number, gainStart = 0.2): void {
    const ctx = this.ensureContext();
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = gainStart;
    src.connect(gain);
    gain.connect(this.sfxGain ?? ctx.destination);
    src.start();
  }

  hit(): void {
    this.tone(320 + Math.random() * 80, 0.06, 'square', 0.12);
  }

  crit(): void {
    this.tone(520, 0.09, 'sawtooth', 0.18);
    this.tone(780, 0.07, 'triangle', 0.12);
  }

  enemyDeath(): void {
    this.tone(180 - Math.random() * 40, 0.12, 'sawtooth', 0.15);
  }

  pickupXp(): void {
    this.tone(660, 0.05, 'sine', 0.08);
  }

  pickupChip(): void {
    this.tone(880, 0.05, 'square', 0.1);
    this.tone(1100, 0.06, 'square', 0.06);
  }

  levelUp(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, 'triangle', 0.18), i * 70);
    });
  }

  jackpot(): void {
    [523, 659, 784, 988, 1318].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.2), i * 60);
    });
    this.noiseBurst(0.3, 0.1);
  }

  playerHurt(): void {
    this.tone(140, 0.15, 'sawtooth', 0.2);
    this.noiseBurst(0.1, 0.08);
  }

  playerDeath(): void {
    [400, 300, 200, 120].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.2), i * 140);
    });
  }

  victory(): void {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'triangle', 0.2), i * 110);
    });
  }

  uiClick(): void {
    this.tone(440, 0.04, 'square', 0.08);
  }

  bossSpawn(): void {
    this.tone(90, 0.6, 'sawtooth', 0.25);
    this.noiseBurst(0.4, 0.12);
  }

  startMusic(): void {
    if (this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    const bassline = [110, 110, 146.8, 130.8];
    const step = () => {
      const freq = bassline[this.musicStep % bassline.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.musicGain ?? ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      this.musicStep++;
    };
    step();
    this.musicTimer = window.setInterval(step, 550);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
