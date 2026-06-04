// =====================================================================
// AudioManager.ts — 100% procedural Web Audio, zero files.
// CHEERFUL major-key soundtrack (bright bouncy arpeggios) + playful SFX.
// Same robust architecture as prior games (track banks, musicGen guard,
// tracked drone nodes) but happy, not moody.
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

  // ---- Happy music banks --------------------------------------------
  // MENU: warm major pads (C → G → Am → F) with a sparkly bell melody.
  private static readonly MENU_TRACKS = [
    {
      chords: [[130.81, 164.81, 196.00, 261.63], [196.00, 246.94, 293.66, 392.00], [220.00, 261.63, 329.63, 440.00], [174.61, 220.00, 261.63, 349.23]],
      melody: { 2: 523.25, 5: 659.25, 8: 587.33, 11: 783.99, 14: 659.25, 18: 880.00, 22: 783.99, 26: 659.25, 29: 523.25 } as Record<number, number>,
      bass: [65.41, 98.00, 110.00, 87.31], stepDur: 0.4,
    },
    {
      chords: [[146.83, 185.00, 220.00, 293.66], [164.81, 207.65, 246.94, 329.63], [196.00, 246.94, 293.66, 392.00], [130.81, 164.81, 196.00, 261.63]],
      melody: { 1: 587.33, 4: 698.46, 7: 880.00, 10: 698.46, 13: 659.25, 17: 783.99, 21: 987.77, 25: 783.99, 28: 659.25 } as Record<number, number>,
      bass: [73.42, 82.41, 98.00, 65.41], stepDur: 0.38,
    },
  ];

  // GAME: brisk upbeat arpeggios with a kick + bright plucks (varies by mission).
  private static readonly GAME_TRACKS = [
    { arp: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 392.00, 523.25], bass: [65.41, 65.41, 98.00, 87.31], stepDur: 0.2 },
    { arp: [293.66, 369.99, 440.00, 587.33, 440.00, 369.99, 440.00, 587.33], bass: [73.42, 73.42, 110.00, 98.00], stepDur: 0.18 },
    { arp: [329.63, 415.30, 493.88, 659.25, 493.88, 415.30, 493.88, 659.25], bass: [82.41, 82.41, 123.47, 110.00], stepDur: 0.17 },
  ];

  private static menuTrack = 0;
  private static gameTrack = 0;

  static init(musicVol?: number, sfxVol?: number): void {
    if (musicVol !== undefined) this.musicVolume = musicVol;
    if (sfxVol !== undefined) this.sfxVolume = sfxVol;
    if (this.ctx) return;
    try {
      const Ctor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
      this.setupUnlock();
    } catch (e) {
      console.warn('[Audio] unavailable', e);
    }
  }

  private static setupUnlock(): void {
    const resume = () => { if (this.ctx?.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('click', resume);
    window.addEventListener('touchstart', resume);
    window.addEventListener('touchend', resume);
  }
  static resume(): void { this.init(); if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  static setMusicVolume(v: number): void {
    this.musicVolume = Math.min(1, Math.max(0, v));
    if (this.musicGain && this.ctx) this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
  }
  static setSfxVolume(v: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, v));
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
  }
  static getMusicVolume(): number { return this.musicVolume; }
  static getSfxVolume(): number { return this.sfxVolume; }

  // ---- helpers ------------------------------------------------------
  private static tone(f0: number, f1: number, dur: number, type: OscillatorType, peak: number, dest?: GainNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(dest || this.sfxGain!);
    osc.start(now); osc.stop(now + dur + 0.02);
  }
  private static noise(dur: number, peak: number, filter: BiquadFilterType, freq: number, dest?: GainNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const size = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const flt = this.ctx.createBiquadFilter(); flt.type = filter; flt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(flt); flt.connect(g); g.connect(dest || this.sfxGain!);
    src.start(now); src.stop(now + dur + 0.02);
  }

  // ---- SFX ----------------------------------------------------------
  // Thrust = soft airy whoosh; called repeatedly while held but throttled by caller.
  static thrust(): void {
    this.resume();
    this.noise(0.14, 0.05, 'bandpass', 600 + Math.random() * 200);
  }
  static magnetLock(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(440, 880, 0.18, 'square', 0.14);
    [660, 880, 1100].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.1, 'sine', 0.08), i * 40));
  }
  static zap(): void { this.resume(); this.tone(1200, 900, 0.04, 'sawtooth', 0.04); }
  static bump(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(180, 90, 0.12, 'square', 0.16);
    this.noise(0.1, 0.14, 'lowpass', 800);
  }
  static crash(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(140, 50, 0.4, 'sawtooth', 0.3);
    this.noise(0.45, 0.32, 'lowpass', 700);
  }
  static pickup(): void {
    this.resume(); if (!this.ctx) return;
    [659.25, 880, 1174.66].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.12, 'triangle', 0.12), i * 45));
  }
  static deliver(): void {
    this.resume(); if (!this.ctx) return;
    // Happy ascending fanfare
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, f, 0.26, 'triangle', 0.18), i * 100));
  }
  static fail(): void {
    this.resume(); if (!this.ctx) return;
    [440, 349.23, 261.63, 196.00].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.34, 'sawtooth', 0.2), i * 150));
  }
  static lowFuel(): void { this.resume(); this.tone(880, 660, 0.12, 'square', 0.14); }
  static uiTap(): void { this.resume(); this.tone(740, 740, 0.05, 'square', 0.07); }
  static uiConfirm(): void { this.resume(); this.tone(523.25, 783.99, 0.14, 'triangle', 0.12); }
  static upgrade(): void {
    this.resume(); if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.16, 'triangle', 0.14), i * 70));
  }

  // ---- Music --------------------------------------------------------
  static startMusic(type: MusicType, seed?: number): void {
    this.init(); this.resume();
    if (this.seqId && this.activeMusic === type) return;
    if (this.seqId) this.stopMusic();
    this.activeMusic = type;
    this.step = 0;

    if (type === 'menu') {
      this.menuTrack = (seed ?? (this.menuTrack + 1)) % this.MENU_TRACKS.length;
      const track = this.MENU_TRACKS[this.menuTrack];
      this.startDrone([track.bass[0] * 0.5, track.bass[0] * 0.75]);
      this.seqId = window.setInterval(() => this.menuStep(track), track.stepDur * 1000);
      this.menuStep(track);
    } else {
      this.gameTrack = (seed ?? 0) % this.GAME_TRACKS.length;
      const track = this.GAME_TRACKS[this.gameTrack];
      this.seqId = window.setInterval(() => this.gameStep(track), track.stepDur * 1000);
      this.gameStep(track);
    }
  }

  private static menuStep(track: typeof AudioManager.MENU_TRACKS[number]): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const stepDur = track.stepDur;
    const cycle = this.step % 32;
    const idx = Math.floor(cycle / 8);
    const chord = track.chords[idx];
    if (cycle % 8 === 0) {
      // Warm pad
      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        const flt = this.ctx!.createBiquadFilter();
        osc.type = 'triangle'; osc.frequency.value = freq;
        osc.detune.value = (i % 2 ? -1 : 1) * 4;
        flt.type = 'lowpass'; flt.frequency.value = 2200;
        const peak = 0.05 - i * 0.006;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(peak, now + 0.4);
        g.gain.setValueAtTime(peak, now + stepDur * 5);
        g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 8);
        osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
        osc.start(now); osc.stop(now + stepDur * 8.1);
      });
      // Bass pluck
      this.tone(track.bass[idx], track.bass[idx], stepDur * 4, 'sine', 0.12, this.musicGain);
    }
    // Sparkly bell melody
    const mel = track.melody[cycle];
    if (mel) {
      this.tone(mel, mel, stepDur * 2, 'triangle', 0.05, this.musicGain);
      const cap = this.musicGen;
      window.setTimeout(() => {
        if (this.musicGen !== cap || !this.musicGain) return;
        this.tone(mel * 2, mel * 2, stepDur * 1.2, 'sine', 0.015, this.musicGain);
      }, 90);
    }
    this.step++;
  }

  private static gameStep(track: typeof AudioManager.GAME_TRACKS[number]): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const stepDur = track.stepDur;
    const s = this.step;

    // Bright pluck arpeggio
    const f = track.arp[s % track.arp.length];
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle'; osc.frequency.value = f;
    g.gain.setValueAtTime(0.07, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 1.4);
    osc.connect(g); g.connect(this.musicGain);
    osc.start(now); osc.stop(now + stepDur * 1.5);

    // Bouncy bass on the beat
    if (s % 2 === 0) {
      const bass = track.bass[Math.floor(s / 2) % track.bass.length];
      this.tone(bass, bass, stepDur * 1.6, 'sine', 0.13, this.musicGain);
    }
    // Kick + hat
    if (s % 4 === 0) {
      const k = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      k.type = 'sine';
      k.frequency.setValueAtTime(140, now);
      k.frequency.exponentialRampToValueAtTime(45, now + 0.1);
      kg.gain.setValueAtTime(0.16, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      k.connect(kg); kg.connect(this.musicGain);
      k.start(now); k.stop(now + 0.14);
    }
    if (s % 2 === 1) this.noise(0.025, 0.018, 'highpass', 9000, this.musicGain);
    this.step++;
  }

  static stopMusic(): void {
    this.musicGen++;
    if (this.seqId) { window.clearInterval(this.seqId); this.seqId = null; }
    this.stopDrone();
    this.activeMusic = null;
  }

  private static startDrone(roots: readonly number[] = [32.70, 49.00]): void {
    if (!this.ctx || !this.musicGain || this.droneNodes.length) return;
    const now = this.ctx.currentTime;
    const add = (freq: number, detune: number, vol: number) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const flt = this.ctx!.createBiquadFilter();
      osc.type = 'triangle'; osc.frequency.value = freq; osc.detune.value = detune;
      flt.type = 'lowpass'; flt.frequency.value = 200;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 2.5);
      osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
      osc.start(now);
      this.droneNodes.push({ osc, gain: g });
    };
    add(roots[0], 0, 0.05);
    add(roots[1] ?? roots[0] * 1.5, 4, 0.035);
  }

  private static stopDrone(): void {
    if (!this.ctx || !this.droneNodes.length) return;
    const now = this.ctx.currentTime;
    this.droneNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.stop(now + 1.3);
      } catch { /* already stopped */ }
    });
    this.droneNodes = [];
  }
}

export default AudioManager;
