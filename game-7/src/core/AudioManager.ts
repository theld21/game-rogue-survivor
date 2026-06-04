// =====================================================================
// AudioManager.ts — 100% procedural Web Audio, zero files.
// Tense electronic soundtrack + punchy cyber-slash SFX. iOS unlock,
// musicGen guard, tracked drone nodes (leak-safe, proven pattern).
// =====================================================================

type MusicType = 'menu' | 'game';

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static master: GainNode | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;

  private static musicVolume = 0.5;
  private static sfxVolume = 0.8;

  private static seqId: number | null = null;
  private static step = 0;
  private static activeMusic: MusicType | null = null;
  private static musicGen = 0;
  private static droneNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

  // Driving minor-key arpeggios (tense, cyber). Picked by level.
  private static readonly GAME_TRACKS = [
    { arp: [110.0, 164.81, 220.0, 164.81, 130.81, 196.0, 261.63, 196.0], bass: [55, 55, 65.41, 49], stepDur: 0.16 },
    { arp: [123.47, 185.0, 246.94, 185.0, 146.83, 220.0, 293.66, 220.0], bass: [61.74, 61.74, 73.42, 55], stepDur: 0.15 },
    { arp: [146.83, 220.0, 293.66, 220.0, 174.61, 261.63, 349.23, 261.63], bass: [73.42, 73.42, 87.31, 65.41], stepDur: 0.14 },
  ];
  private static readonly MENU_TRACK = {
    chords: [[110, 164.81, 220], [98, 146.83, 196], [123.47, 185, 246.94], [110, 164.81, 220]],
    melody: { 2: 440, 6: 523.25, 10: 659.25, 14: 587.33, 18: 440, 22: 523.25, 26: 659.25, 30: 880 } as Record<number, number>,
    stepDur: 0.34,
  };
  private static gameTrack = 0;

  static init(musicVol?: number, sfxVol?: number): void {
    if (musicVol !== undefined) this.musicVolume = musicVol;
    if (sfxVol !== undefined) this.sfxVolume = sfxVol;
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVolume; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVolume; this.sfxGain.connect(this.master);
      this.setupUnlock();
    } catch (e) { console.warn('[Audio] unavailable', e); }
  }
  private static setupUnlock(): void {
    const r = () => { if (this.ctx?.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('click', r); window.addEventListener('touchstart', r); window.addEventListener('touchend', r);
  }
  static resume(): void { this.init(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }
  static setMusicVolume(v: number): void { this.musicVolume = Math.min(1, Math.max(0, v)); if (this.musicGain && this.ctx) this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime); }
  static setSfxVolume(v: number): void { this.sfxVolume = Math.min(1, Math.max(0, v)); if (this.sfxGain && this.ctx) this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime); }
  static getMusicVolume(): number { return this.musicVolume; }
  static getSfxVolume(): number { return this.sfxVolume; }

  private static tone(f0: number, f1: number, dur: number, type: OscillatorType, peak: number, dest?: GainNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    g.gain.setValueAtTime(peak, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g); g.connect(dest || this.sfxGain!); o.start(now); o.stop(now + dur + 0.02);
  }
  private static noise(dur: number, peak: number, filter: BiquadFilterType, freq: number, dest?: GainNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const size = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(peak, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain!); src.start(now); src.stop(now + dur + 0.02);
  }

  // ---- SFX ----
  static slowEnter(): void { this.resume(); this.tone(900, 200, 0.4, 'sawtooth', 0.06); this.tone(440, 110, 0.5, 'sine', 0.05); }
  static slowExit(): void { this.resume(); this.tone(200, 1200, 0.18, 'sawtooth', 0.08); }
  static slash(combo = 1): void {
    this.resume(); if (!this.ctx) return;
    const base = 700 + combo * 80;
    this.tone(base, base * 0.3, 0.1, 'sawtooth', 0.2);
    this.noise(0.08, 0.18, 'highpass', 3000);
  }
  static combo(n: number): void { this.resume(); const f = 520 + n * 60; this.tone(f, f, 0.1, 'triangle', 0.12); }
  static shieldBounce(): void { this.resume(); if (!this.ctx) return; this.tone(300, 160, 0.18, 'square', 0.18); this.noise(0.12, 0.14, 'bandpass', 1400); }
  static bullet(): void { this.resume(); this.tone(880, 600, 0.06, 'square', 0.05); }
  static land(): void { this.resume(); if (!this.ctx) return; this.tone(160, 60, 0.14, 'sine', 0.16); this.noise(0.12, 0.12, 'lowpass', 700); }
  static emp(): void { this.resume(); if (!this.ctx) return; this.tone(1200, 200, 0.4, 'sawtooth', 0.16); this.noise(0.4, 0.18, 'lowpass', 1800); }
  static hurt(): void { this.resume(); if (!this.ctx) return; this.tone(220, 90, 0.2, 'sawtooth', 0.18); this.noise(0.18, 0.16, 'lowpass', 600); }
  static fail(): void { this.resume(); if (!this.ctx) return; [330, 261.63, 196, 130.81].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.34, 'sawtooth', 0.2), i * 150)); }
  static victory(): void { this.resume(); if (!this.ctx) return; [392, 523.25, 659.25, 880, 1046.5].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.28, 'triangle', 0.2), i * 110)); }
  static uiTap(): void { this.resume(); this.tone(760, 760, 0.04, 'square', 0.07); }
  static uiConfirm(): void { this.resume(); this.tone(440, 880, 0.12, 'triangle', 0.12); }
  static upgrade(): void { this.resume(); if (!this.ctx) return; [440, 587.33, 880].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.16, 'triangle', 0.14), i * 70)); }

  // ---- Music ----
  static startMusic(type: MusicType, seed?: number): void {
    this.init(); this.resume();
    if (this.seqId && this.activeMusic === type) return;
    if (this.seqId) this.stopMusic();
    this.activeMusic = type; this.step = 0;
    if (type === 'menu') {
      this.startDrone([55, 82.41]);
      this.seqId = window.setInterval(() => this.menuStep(), this.MENU_TRACK.stepDur * 1000);
      this.menuStep();
    } else {
      this.gameTrack = (seed ?? 0) % this.GAME_TRACKS.length;
      const t = this.GAME_TRACKS[this.gameTrack];
      this.seqId = window.setInterval(() => this.gameStep(t), t.stepDur * 1000);
      this.gameStep(t);
    }
  }

  private static menuStep(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime; const T = this.MENU_TRACK; const cyc = this.step % 32;
    if (cyc % 8 === 0) {
      T.chords[Math.floor(cyc / 8)].forEach((freq, i) => {
        const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain(); const flt = this.ctx!.createBiquadFilter();
        o.type = i === 0 ? 'sawtooth' : 'triangle'; o.frequency.value = freq; o.detune.value = (i % 2 ? -1 : 1) * 4;
        flt.type = 'lowpass'; flt.frequency.value = 1400;
        const pk = 0.05 - i * 0.008;
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(pk, now + 0.5);
        g.gain.setValueAtTime(pk, now + T.stepDur * 5); g.gain.exponentialRampToValueAtTime(0.001, now + T.stepDur * 8);
        o.connect(flt); flt.connect(g); g.connect(this.musicGain!); o.start(now); o.stop(now + T.stepDur * 8.1);
      });
    }
    const mel = T.melody[cyc];
    if (mel) this.tone(mel, mel, T.stepDur * 2, 'triangle', 0.04, this.musicGain);
    this.step++;
  }

  private static gameStep(t: typeof AudioManager.GAME_TRACKS[number]): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime; const s = this.step;
    const f = t.arp[s % t.arp.length];
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); const flt = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; flt.type = 'lowpass'; flt.Q.value = 6;
    flt.frequency.setValueAtTime(500, now); flt.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.01, now + t.stepDur * 0.9);
    o.connect(flt); flt.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + t.stepDur);
    if (s % 2 === 0) {
      const b = t.bass[Math.floor(s / 2) % t.bass.length];
      this.tone(b, b, t.stepDur * 1.6, 'sine', 0.14, this.musicGain);
    }
    if (s % 4 === 0) {
      const k = this.ctx.createOscillator(); const kg = this.ctx.createGain();
      k.type = 'sine'; k.frequency.setValueAtTime(150, now); k.frequency.exponentialRampToValueAtTime(45, now + 0.1);
      kg.gain.setValueAtTime(0.18, now); kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      k.connect(kg); kg.connect(this.musicGain); k.start(now); k.stop(now + 0.14);
    }
    if (s % 2 === 1) this.noise(0.02, 0.02, 'highpass', 9000, this.musicGain);
    this.step++;
  }

  static stopMusic(): void {
    this.musicGen++;
    if (this.seqId) { window.clearInterval(this.seqId); this.seqId = null; }
    this.stopDrone();
    this.activeMusic = null;
  }

  private static startDrone(roots: readonly number[]): void {
    if (!this.ctx || !this.musicGain || this.droneNodes.length) return;
    const now = this.ctx.currentTime;
    const add = (freq: number, detune: number, vol: number) => {
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain(); const flt = this.ctx!.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = detune; flt.type = 'lowpass'; flt.frequency.value = 180;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + 3);
      o.connect(flt); flt.connect(g); g.connect(this.musicGain!); o.start(now);
      this.droneNodes.push({ osc: o, gain: g });
    };
    add(roots[0] * 0.5, 0, 0.07); add(roots[1] * 0.5, 5, 0.045);
  }
  private static stopDrone(): void {
    if (!this.ctx || !this.droneNodes.length) return;
    const now = this.ctx.currentTime;
    this.droneNodes.forEach(({ osc, gain }) => {
      try { gain.gain.setValueAtTime(gain.gain.value, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); osc.stop(now + 1.3); } catch { /* stopped */ }
    });
    this.droneNodes = [];
  }
}

export default AudioManager;
