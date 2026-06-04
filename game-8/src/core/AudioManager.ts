// =====================================================================
// AudioManager.ts — zero-asset procedural Web Audio. One context, master→
// music/sfx gains. iOS unlock on first touch. Compact SFX set + a calm
// ambient sky-drone music loop. All oscillators tracked + stopped (leak-safe).
// =====================================================================

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private drone: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private seq: number | null = null;
  private musicGen = 0;
  private noiseBuf: AudioBuffer | null = null;

  init(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.45; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
    // noise buffer
    const len = this.ctx.sampleRate * 0.4; const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    const unlock = () => { this.ctx?.resume(); };
    ['touchstart', 'touchend', 'click', 'pointerdown'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  }

  setMusicVolume(v: number): void { if (this.musicGain) this.musicGain.gain.value = v; }
  setSfxVolume(v: number): void { if (this.sfxGain) this.sfxGain.gain.value = v; }

  private blip(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number): void {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  private noise(dur: number, vol = 0.3, hp = 400): void {
    if (!this.ctx || !this.noiseBuf) return; const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); s.stop(t + dur);
  }

  // ---- SFX ----
  laser(): void { this.blip(720, 0.12, 'square', 0.18, 240); }
  enemyShot(): void { this.blip(300, 0.14, 'sawtooth', 0.12, 150); }
  mine(): void { this.blip(540, 0.07, 'sine', 0.1, 680); }
  pickup(): void { this.blip(880, 0.09, 'triangle', 0.16, 1320); }
  hit(): void { this.noise(0.12, 0.22, 800); }
  hurt(): void { this.blip(180, 0.18, 'sawtooth', 0.25, 80); this.noise(0.12, 0.18, 300); }
  explode(): void { this.noise(0.45, 0.4, 200); this.blip(120, 0.4, 'sine', 0.2, 40); }
  thunder(): void { this.noise(0.7, 0.5, 120); this.blip(80, 0.5, 'sine', 0.25, 36); }
  trade(): void { this.blip(660, 0.08, 'sine', 0.18, 990); this.blip(990, 0.1, 'sine', 0.16); }
  event(): void { this.blip(420, 0.18, 'triangle', 0.2, 840); this.blip(560, 0.22, 'triangle', 0.16, 1120); }
  victory(): void { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.22), i * 140)); }
  uiTap(): void { this.blip(520, 0.05, 'sine', 0.14, 760); }
  uiConfirm(): void { this.blip(440, 0.08, 'triangle', 0.2, 880); this.blip(880, 0.1, 'triangle', 0.16); }

  // ---- Ambient music ----
  startMusic(): void {
    if (!this.ctx || this.seq !== null) return;
    this.musicGen++; const gen = this.musicGen;
    const root = 110;
    [1, 1.5, 2].forEach((m, i) => {
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
      o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = root * m;
      g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.05 / (i + 1), this.ctx!.currentTime + 3);
      o.connect(g); g.connect(this.musicGain); o.start();
      this.drone.push({ osc: o, gain: g });
    });
    const scale = [0, 3, 5, 7, 10, 12];
    let step = 0;
    this.seq = window.setInterval(() => {
      if (this.musicGen !== gen || !this.ctx) return;
      if (step % 2 === 0) {
        const n = scale[Math.floor(Math.random() * scale.length)];
        const f = 330 * Math.pow(2, n / 12);
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const t = this.ctx.currentTime;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 2);
      }
      step++;
    }, 1400);
  }
  stopMusic(): void {
    this.musicGen++;
    if (this.seq !== null) { clearInterval(this.seq); this.seq = null; }
    this.drone.forEach(({ osc, gain }) => {
      try { if (this.ctx) gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6); osc.stop((this.ctx?.currentTime ?? 0) + 0.7); } catch { /* */ }
    });
    this.drone = [];
  }
}

export const AudioManager = new AudioManagerImpl();
export default AudioManager;
