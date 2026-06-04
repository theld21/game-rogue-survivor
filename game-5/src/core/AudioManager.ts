// =====================================================================
// AudioManager.ts — 100% procedural Web Audio. Zero audio files.
// Sci-fi SFX (laser, claw launch, grab, asteroid crack, pickup, alarm)
// plus an ambient synth-space pad loop. iOS WKWebView unlock included.
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

  // ---- Music banks: multiple tracks for variety --------------------
  // Each MENU track = ambient chord progression + sparse melody + drone roots.
  private static readonly MENU_TRACKS = [
    { // 0: Cm — moody deep space
      chords: [[65.41, 98.00, 130.81, 196.00], [51.91, 77.78, 103.83, 155.56], [77.78, 116.54, 155.56, 233.08], [58.27, 87.31, 116.54, 174.61]],
      melody: { 2: 523.25, 6: 622.25, 10: 466.16, 14: 392.00, 18: 523.25, 22: 587.33, 26: 466.16, 30: 698.46 } as Record<number, number>,
      drone: [32.70, 49.00], stepDur: 0.62,
    },
    { // 1: Am — wistful, dreamy
      chords: [[55.00, 82.41, 110.00, 164.81], [43.65, 65.41, 87.31, 130.81], [49.00, 73.42, 98.00, 146.83], [41.20, 61.74, 82.41, 123.47]],
      melody: { 3: 440.00, 7: 523.25, 11: 659.25, 15: 587.33, 19: 440.00, 23: 392.00, 27: 493.88, 31: 659.25 } as Record<number, number>,
      drone: [27.50, 41.20], stepDur: 0.7,
    },
    { // 2: Dm — mysterious, slow
      chords: [[73.42, 110.00, 146.83, 220.00], [58.27, 87.31, 116.54, 174.61], [65.41, 98.00, 130.81, 196.00], [49.00, 73.42, 98.00, 146.83]],
      melody: { 4: 587.33, 10: 698.46, 16: 523.25, 22: 440.00, 28: 587.33 } as Record<number, number>,
      drone: [36.71, 55.00], stepDur: 0.66,
    },
  ];

  // Each GAME track = looping bass arpeggio + percussion style. Picked by level.
  private static readonly GAME_TRACKS = [
    { arp: [130.81, 196.00, 261.63, 196.00, 155.56, 233.08, 311.13, 233.08], stepDur: 0.30, kick: true, bell: false, wave: 'sawtooth' as OscillatorType },
    { arp: [146.83, 220.00, 293.66, 220.00, 174.61, 261.63, 349.23, 261.63], stepDur: 0.27, kick: true, bell: true,  wave: 'square' as OscillatorType },
    { arp: [110.00, 164.81, 220.00, 277.18, 220.00, 164.81, 196.00, 246.94], stepDur: 0.34, kick: false, bell: true, wave: 'triangle' as OscillatorType },
    { arp: [164.81, 246.94, 329.63, 246.94, 196.00, 293.66, 392.00, 293.66], stepDur: 0.25, kick: true, bell: false, wave: 'sawtooth' as OscillatorType },
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
      console.warn('[Audio] Web Audio unavailable', e);
    }
  }

  private static setupUnlock(): void {
    const resume = () => { if (this.ctx?.state === 'suspended') this.ctx.resume(); };
    window.addEventListener('click', resume);
    window.addEventListener('touchstart', resume);
    window.addEventListener('touchend', resume);
  }

  static resume(): void {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

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

  // ---- Low-level helpers --------------------------------------------
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
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = filter; flt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(flt); flt.connect(g); g.connect(dest || this.sfxGain!);
    src.start(now); src.stop(now + dur + 0.02);
  }

  // ---- SFX ----------------------------------------------------------
  static laser(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(1200, 320, 0.16, 'sawtooth', 0.18);
    this.tone(2400, 800, 0.1, 'square', 0.06);
  }
  static clawLaunch(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(160, 420, 0.18, 'square', 0.14);
    this.noise(0.12, 0.1, 'highpass', 2000);
  }
  static clawGrab(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(520, 180, 0.12, 'sawtooth', 0.16);
    this.noise(0.08, 0.14, 'bandpass', 1200);
  }
  static asteroidCrack(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(220, 60, 0.3, 'sawtooth', 0.22);
    this.noise(0.32, 0.3, 'lowpass', 900);
  }
  static asteroidHit(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(320, 160, 0.08, 'square', 0.1);
    this.noise(0.06, 0.1, 'bandpass', 2200);
  }
  static pickup(rarity = 'common'): void {
    this.resume(); if (!this.ctx) return;
    const base = rarity === 'legendary' ? 660 : rarity === 'epic' ? 587 : rarity === 'rare' ? 523 : 440;
    [base, base * 1.25, base * 1.5].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, f, 0.14, 'triangle', 0.13), i * 55));
  }
  static credits(): void {
    this.resume(); if (!this.ctx) return;
    [880, 1174, 1567].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.1, 'sine', 0.1), i * 38));
  }
  static hullHit(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(140, 50, 0.3, 'sawtooth', 0.3);
    this.noise(0.3, 0.28, 'lowpass', 600);
  }
  static alarm(): void {
    this.resume(); if (!this.ctx) return;
    [0, 0.18].forEach((o) => window.setTimeout(() => this.tone(880, 660, 0.14, 'square', 0.18), o * 1000));
  }
  static uiTap(): void { this.resume(); this.tone(720, 720, 0.05, 'square', 0.07); }
  static uiConfirm(): void {
    this.resume(); if (!this.ctx) return;
    this.tone(520, 780, 0.12, 'triangle', 0.12);
  }
  static upgrade(): void {
    this.resume(); if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.18, 'triangle', 0.14), i * 70));
  }
  static victory(): void {
    this.resume(); if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.3, 'triangle', 0.2), i * 130));
  }
  static defeat(): void {
    this.resume(); if (!this.ctx) return;
    [440, 349.23, 261.63, 174.61].forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.36, 'sawtooth', 0.2), i * 160));
  }

  // ---- Music --------------------------------------------------------
  // `seed` selects a track variant (e.g. the level number) for diversity.
  static startMusic(type: MusicType, seed?: number): void {
    this.init(); this.resume();
    if (this.seqId && this.activeMusic === type) return;
    if (this.seqId) this.stopMusic();
    this.activeMusic = type;
    this.step = 0;

    if (type === 'menu') {
      // Rotate through menu tracks (pseudo-random via step counter + seed)
      this.menuTrack = (seed ?? (this.menuTrack + 1)) % this.MENU_TRACKS.length;
      const track = this.MENU_TRACKS[this.menuTrack];
      this.startDrone(track.drone);
      const stepDur = track.stepDur;
      this.seqId = window.setInterval(() => this.menuStep(track, stepDur), stepDur * 1000);
      this.menuStep(track, stepDur);
    } else {
      this.gameTrack = (seed ?? 0) % this.GAME_TRACKS.length;
      const track = this.GAME_TRACKS[this.gameTrack];
      const stepDur = track.stepDur;
      this.seqId = window.setInterval(() => this.gameStep(track, stepDur), stepDur * 1000);
      this.gameStep(track, stepDur);
    }
  }

  private static menuStep(track: typeof AudioManager.MENU_TRACKS[number], stepDur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const cycle = this.step % 32;
    const chord = track.chords[Math.floor(cycle / 8)];
    if (cycle % 8 === 0) {
      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        const flt = this.ctx!.createBiquadFilter();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = (i % 2 ? -1 : 1) * (i + 1) * 3;
        flt.type = 'lowpass'; flt.frequency.value = 1100 - i * 90;
        const peak = i === 0 ? 0.06 : 0.034 - i * 0.004;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(peak, now + 1.2);
        g.gain.setValueAtTime(peak, now + stepDur * 5.5);
        g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 8);
        osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
        osc.start(now); osc.stop(now + stepDur * 8.1);
      });
    }
    const mel = track.melody[cycle];
    if (mel) {
      const capturedGen = this.musicGen;
      this.tone(mel, mel, stepDur * 2.5, 'triangle', 0.03, this.musicGain);
      window.setTimeout(() => {
        if (this.musicGen !== capturedGen || !this.musicGain) return;
        this.tone(mel, mel, stepDur * 1.8, 'sine', 0.008, this.musicGain);
      }, 200);
    }
    this.step++;
  }

  private static gameStep(track: typeof AudioManager.GAME_TRACKS[number], stepDur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const s = this.step;
    const f = track.arp[s % track.arp.length];

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const flt = this.ctx.createBiquadFilter();
    osc.type = track.wave; osc.frequency.value = f;
    flt.type = 'lowpass'; flt.Q.value = 4;
    flt.frequency.setValueAtTime(400, now);
    flt.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + stepDur * 0.9);
    osc.connect(flt); flt.connect(g); g.connect(this.musicGain);
    osc.start(now); osc.stop(now + stepDur);

    if (track.kick && s % 2 === 0) {
      const k = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      k.type = 'sine';
      k.frequency.setValueAtTime(120, now);
      k.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      kg.gain.setValueAtTime(0.16, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      k.connect(kg); kg.connect(this.musicGain);
      k.start(now); k.stop(now + 0.16);
    }
    // Sparkly bell accent every 4 steps for bell tracks
    if (track.bell && s % 4 === 2) {
      this.tone(f * 4, f * 4, stepDur * 1.5, 'sine', 0.03, this.musicGain);
    }
    // Hat off-beat
    if (s % 2 === 1) this.noise(0.03, 0.02, 'highpass', 8000, this.musicGain);
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
      osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = detune;
      flt.type = 'lowpass'; flt.frequency.value = 160;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 3.5);
      osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
      osc.start(now);
      this.droneNodes.push({ osc, gain: g });
    };
    add(roots[0], 0, 0.08);
    add(roots[1] ?? roots[0] * 1.5, 5, 0.05);
  }

  private static stopDrone(): void {
    if (!this.ctx || !this.droneNodes.length) return;
    const now = this.ctx.currentTime;
    this.droneNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.stop(now + 1.6);
      } catch { /* already stopped */ }
    });
    this.droneNodes = [];
  }
}

export default AudioManager;
