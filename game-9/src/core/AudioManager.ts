// =====================================================================
// AudioManager.ts — zero-asset procedural Web Audio. Deep, watery ambience
// + sonar ping, thrust, harvest, creature, damage SFX. All nodes tracked
// and stopped (leak-safe). iOS unlock on first touch.
// =====================================================================

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private musicGain!: GainNode; private sfxGain!: GainNode;
  private drone: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private seq: number | null = null; private musicGen = 0; private noiseBuf: AudioBuffer | null = null;

  init(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.4; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
    const len = this.ctx.sampleRate * 0.5; const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
    const unlock = () => this.ctx?.resume();
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
  private noise(dur: number, vol = 0.3, hp = 300): void {
    if (!this.ctx || !this.noiseBuf) return; const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start(t); s.stop(t + dur);
  }

  sonar(): void { this.blip(1400, 0.5, 'sine', 0.22, 520); this.blip(2100, 0.3, 'sine', 0.12); }
  thrust(): void { this.noise(0.1, 0.05, 200); }
  harvest(): void { this.blip(520, 0.07, 'sine', 0.12, 760); }
  pickup(): void { this.blip(720, 0.1, 'triangle', 0.16, 1180); }
  harpoon(): void { this.blip(380, 0.12, 'sawtooth', 0.14, 140); }
  hitCreature(): void { this.noise(0.1, 0.18, 500); }
  hurt(): void { this.blip(150, 0.2, 'sawtooth', 0.26, 70); this.noise(0.14, 0.2, 240); }
  creature(): void { this.blip(90, 0.5, 'sine', 0.2, 50); this.noise(0.3, 0.1, 120); }
  explode(): void { this.noise(0.55, 0.42, 160); this.blip(100, 0.5, 'sine', 0.22, 36); }
  warn(): void { this.blip(330, 0.14, 'square', 0.14, 220); }
  trade(): void { this.blip(660, 0.08, 'sine', 0.18, 990); this.blip(990, 0.1, 'sine', 0.16); }
  victory(): void { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.35, 'triangle', 0.2), i * 150)); }
  uiTap(): void { this.blip(520, 0.05, 'sine', 0.13, 760); }
  uiConfirm(): void { this.blip(440, 0.08, 'triangle', 0.2, 880); this.blip(880, 0.1, 'triangle', 0.15); }

  startMusic(): void {
    if (!this.ctx || this.seq !== null) return;
    this.musicGen++; const gen = this.musicGen; const root = 55;
    [1, 1.5, 2.02].forEach((m, i) => {
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
      o.type = 'sine'; o.frequency.value = root * m;
      g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.06 / (i + 1), this.ctx!.currentTime + 4);
      o.connect(g); g.connect(this.musicGain); o.start(); this.drone.push({ osc: o, gain: g });
    });
    const scale = [0, 3, 7, 10, 12];
    this.seq = window.setInterval(() => {
      if (this.musicGen !== gen || !this.ctx) return;
      if (Math.random() < 0.5) {
        const n = scale[Math.floor(Math.random() * scale.length)]; const f = 220 * Math.pow(2, n / 12);
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const t = this.ctx.currentTime;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
        o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + 2.8);
      }
    }, 2000);
  }
  stopMusic(): void {
    this.musicGen++;
    if (this.seq !== null) { clearInterval(this.seq); this.seq = null; }
    this.drone.forEach(({ osc, gain }) => { try { if (this.ctx) gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6); osc.stop((this.ctx?.currentTime ?? 0) + 0.7); } catch { /* */ } });
    this.drone = [];
  }
}
export const AudioManager = new AudioManagerImpl();
export default AudioManager;
