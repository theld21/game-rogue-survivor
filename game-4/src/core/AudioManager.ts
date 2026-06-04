// =====================================================================
// AudioManager.ts — 100% procedural Web Audio. Zero audio files.
//
// All SFX (cannon fire, hull hits, explosions, loot, gold, repair) and the
// looping sea-shanty / neon-tide music are synthesized at runtime, keeping the
// build asset-free. Includes the iOS WKWebView unlock-on-first-gesture trick.
// =====================================================================

type MusicType = 'menu' | 'ingame';

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static master: GainNode | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;

  private static musicVolume = 0.55;
  private static sfxVolume = 0.85;
  private static muted = false;

  private static seqId: number | null = null;
  private static step = 0;
  private static activeMusic: MusicType | null = null;

  // Monotonically-incrementing id so deferred callbacks (setTimeout reverb)
  // can detect whether the music session they were created in is still alive.
  private static musicGen = 0;

  // All drone oscillator layers — tracked as an array so every one is stopped.
  private static droneNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private static droneLfoId: number | null = null;

  // ---- Deep ambient menu music data --------------------------------
  // 32-step cycle, Am → Fmaj7 → Em → G (Dorian/Aeolian feel)
  // Each chord voicing: [bass, inner, mid, upper]
  private static readonly MENU_CHORDS = [
    [55.00, 82.41, 110.00, 164.81],  // Am:   A2 E3 A3 E4
    [43.65, 65.41, 87.31, 130.81],  // Fmaj7: F2 C3 F3 C4
    [41.20, 61.74, 82.41, 123.47],  // Em:    E2 B2 E3 B3
    [49.00, 73.42, 98.00, 146.83],  // G:     G2 D3 G3 D4
  ];
  // Sparse lead melody (A minor pentatonic, high register)
  // index = step within 32-step cycle, 0 = silent
  private static readonly MENU_MELODY: Record<number, number> = {
    3:  220.00,   // A3
    7:  261.63,   // C4
    11: 293.66,   // D4
    14: 329.63,   // E4
    19: 246.94,   // B3
    23: 220.00,   // A3
    27: 196.00,   // G3
    30: 261.63,   // C4
  };

  // In-game rolling bass line
  private static tideBass = [
    55.0, 55.0, 82.41, 55.0,
    73.42, 73.42, 49.0, 49.0,
    65.41, 65.41, 98.0, 65.41,
    49.0, 73.42, 82.41, 55.0,
  ];

  static init(musicVol?: number, sfxVol?: number): void {
    if (musicVol !== undefined) this.musicVolume = musicVol;
    if (sfxVol !== undefined) this.sfxVolume = sfxVol;
    if (this.ctx) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.master);

      this.setupUnlock();
    } catch (e) {
      console.warn('[Audio] Web Audio unavailable', e);
    }
  }

  static setMusicVolume(vol: number): void {
    this.musicVolume = Math.min(1, Math.max(0, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  static setSfxVolume(vol: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  static getMusicVolume(): number { return this.musicVolume; }
  static getSfxVolume(): number { return this.sfxVolume; }

  private static setupUnlock(): void {
    const resume = () => {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('click', resume);
    window.addEventListener('touchstart', resume);
    window.addEventListener('touchend', resume);
  }

  static resume(): void {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ---- volume / mute -------------------------------------------------
  static setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(m ? 0 : 1, this.ctx.currentTime);
    }
  }
  static isMuted(): boolean {
    return this.muted;
  }
  static toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---- low level helpers --------------------------------------------
  private static tone(
    freqStart: number,
    freqEnd: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    dest?: GainNode,
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain!);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private static noise(dur: number, peak: number, filterType: BiquadFilterType, freq: number, dest?: GainNode): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const size = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.sfxGain!);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  // ---- SFX -----------------------------------------------------------
  static cannon(): void {
    this.resume();
    if (!this.ctx) return;
    // Punchy low thud + powder hiss.
    this.tone(180, 40, 0.22, 'sawtooth', 0.32);
    this.noise(0.18, 0.22, 'lowpass', 900);
  }

  static hitHull(): void {
    this.resume();
    if (!this.ctx) return;
    this.tone(140, 70, 0.16, 'square', 0.18);
    this.noise(0.1, 0.16, 'bandpass', 1600);
  }

  static explosion(): void {
    this.resume();
    if (!this.ctx) return;
    this.tone(120, 36, 0.5, 'sine', 0.4);
    this.noise(0.55, 0.5, 'lowpass', 700);
  }

  static splash(): void {
    this.resume();
    this.noise(0.22, 0.12, 'highpass', 2600);
  }

  static loot(): void {
    this.resume();
    if (!this.ctx) return;
    [880, 1174.66, 1567.98].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, f, 0.18, 'triangle', 0.16), i * 55);
    });
  }

  static gold(): void {
    this.resume();
    if (!this.ctx) return;
    [1318.51, 1760, 2093].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, f, 0.12, 'sine', 0.12), i * 40);
    });
  }

  static repair(): void {
    this.resume();
    if (!this.ctx) return;
    this.tone(330, 660, 0.4, 'sine', 0.2);
  }

  static uiTap(): void {
    this.resume();
    this.tone(520, 520, 0.05, 'square', 0.08);
  }

  static discard(): void {
    this.resume();
    this.tone(300, 90, 0.18, 'sawtooth', 0.16);
  }

  static victory(): void {
    this.resume();
    if (!this.ctx) return;
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.32, 'triangle', 0.22), i * 110));
  }

  static defeat(): void {
    this.resume();
    if (!this.ctx) return;
    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((f, i) => window.setTimeout(() => this.tone(f, f, 0.36, 'sawtooth', 0.2), i * 150));
  }

  static alarm(): void {
    this.resume();
    if (!this.ctx) return;
    [0, 0.16].forEach((o) =>
      window.setTimeout(() => this.tone(220, 180, 0.14, 'sawtooth', 0.22), o * 1000),
    );
  }

  // ---- Music sequencer ----------------------------------------------
  static startMusic(type: MusicType): void {
    this.init();
    this.resume();
    if (this.seqId && this.activeMusic === type) return;
    if (this.seqId) this.stopMusic();

    this.activeMusic = type;
    this.step = 0;

    if (type === 'menu') this.startMenuDrone();

    // Menu: 0.72s/step (slow, contemplative). In-game: 0.26s/step (brisk).
    const stepDur = type === 'menu' ? 0.72 : 0.26;

    const playStep = () => {
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const s = this.step;

      if (type === 'menu') {
        const cycle = s % 32;           // 32-step = ~23s full loop
        const chordIdx = Math.floor(cycle / 8);
        const chord = this.MENU_CHORDS[chordIdx];

        // ── Chord pad: attack on beat 0 of each chord block ──────
        if (cycle % 8 === 0) {
          chord.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const g   = this.ctx!.createGain();
            const flt = this.ctx!.createBiquadFilter();
            osc.type = i === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;
            // Slight detune for warmth
            osc.detune.value = (i % 2 === 0 ? 1 : -1) * (i + 1) * 2;
            flt.type = 'lowpass';
            flt.frequency.value = 900 - i * 80;
            flt.Q.value = 0.6;
            // Long slow swell: fade in over 1.4s, sustain, fade out over 5s
            const peakVol = i === 0 ? 0.07 : 0.038 - i * 0.004;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(peakVol, now + 1.4);
            g.gain.setValueAtTime(peakVol, now + stepDur * 5.5);
            g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 8);
            osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
            osc.start(now);
            osc.stop(now + stepDur * 8.1);
          });
        }

        // ── Bass note: deeper thud on chord change ────────────────
        if (cycle % 8 === 0) {
          const osc = this.ctx!.createOscillator();
          const g   = this.ctx!.createGain();
          const flt = this.ctx!.createBiquadFilter();
          osc.type = 'sine';
          osc.frequency.value = chord[0] * 0.5;  // one octave lower
          flt.type = 'lowpass';
          flt.frequency.value = 180;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.14, now + 0.25);
          g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 6);
          osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
          osc.start(now); osc.stop(now + stepDur * 6.1);
        }

        // ── Sparse lead melody ────────────────────────────────────
        const melFreq = this.MENU_MELODY[cycle];
        if (melFreq) {
          const osc = this.ctx!.createOscillator();
          const g   = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.value = melFreq;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.032, now + 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 2.8);
          osc.connect(g); g.connect(this.musicGain!);
          osc.start(now); osc.stop(now + stepDur * 3);
          // Simulated reverb tail — guard against firing after stopMusic()
          const capturedGen = this.musicGen;
          window.setTimeout(() => {
            if (!this.ctx || !this.musicGain || this.musicGen !== capturedGen) return;
            const t = this.ctx.currentTime;
            const o2 = this.ctx.createOscillator();
            const g2 = this.ctx.createGain();
            o2.type = 'sine';
            o2.frequency.value = melFreq;
            g2.gain.setValueAtTime(0.008, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 2);
            o2.connect(g2); g2.connect(this.musicGain);
            o2.start(t); o2.stop(t + stepDur * 2.1);
          }, 220);
        }

        // ── Occasional deep bell ping ─────────────────────────────
        if (cycle % 16 === 12 && Math.random() < 0.55) {
          const bellFreqs = [329.63, 392.00, 440.00, 523.25];
          const f = bellFreqs[Math.floor(Math.random() * bellFreqs.length)];
          this.tone(f, f * 0.98, stepDur * 2.5, 'sine', 0.022, this.musicGain);
        }

        // ── Soft noise breath (atmospheric texture) ──────────────
        if (cycle % 8 === 4 && Math.random() < 0.35) {
          this.noise(stepDur * 3, 0.007, 'bandpass', 400 + Math.random() * 300, this.musicGain);
        }
      } else {
        // Rolling bass tide.
        const f = this.tideBass[s % this.tideBass.length];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        filter.type = 'lowpass';
        filter.Q.value = 2;
        filter.frequency.setValueAtTime(160, now);
        filter.frequency.exponentialRampToValueAtTime(480, now + 0.12);
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + stepDur - 0.02);
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + stepDur);

        // Off-beat hat.
        if (s % 2 === 1) this.noise(0.025, 0.012, 'highpass', 9000, this.musicGain);

        // Plucked shanty melody.
        if (s % 8 === 4 || s % 8 === 6 || s % 16 === 12) {
          const scale = [440, 523.25, 659.25, 587.33, 880];
          const mf = scale[(Math.floor(s / 2) + s) % scale.length];
          this.tone(mf, mf, 0.28, 'triangle', 0.05, this.musicGain);
        }
      }
      this.step++;
    };

    this.seqId = window.setInterval(playStep, stepDur * 1000);
    playStep();
  }

  static stopMusic(): void {
    this.musicGen++;          // invalidates any pending reverb setTimeout callbacks
    if (this.seqId) {
      window.clearInterval(this.seqId);
      this.seqId = null;
    }
    this.stopMenuDrone();
    this.activeMusic = null;
  }

  // ---- Sub-bass drone (all layers tracked — none leak on stopMusic) ---
  private static startMenuDrone(): void {
    if (!this.ctx || !this.musicGain || this.droneNodes.length > 0) return;
    const now = this.ctx.currentTime;

    const addLayer = (freq: number, detune: number, vol: number): void => {
      const osc = this.ctx!.createOscillator();
      const g   = this.ctx!.createGain();
      const flt = this.ctx!.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      flt.type = 'lowpass';
      flt.frequency.value = 140;
      flt.Q.value = 0.4;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 4);
      osc.connect(flt); flt.connect(g); g.connect(this.musicGain!);
      osc.start(now);
      this.droneNodes.push({ osc, gain: g });   // track every layer
    };

    addLayer(27.5, 0, 0.09);   // A0 sub-bass
    addLayer(55,   4, 0.05);   // A1 slight detune — was previously leaked

    // Slow LFO breathe on first layer
    this.droneLfoId = window.setInterval(() => {
      const node = this.droneNodes[0];
      if (!node || !this.ctx) return;
      const t = this.ctx.currentTime;
      node.gain.gain.setValueAtTime(node.gain.gain.value, t);
      node.gain.gain.linearRampToValueAtTime(0.05, t + 4);
      node.gain.gain.linearRampToValueAtTime(0.09, t + 8);
    }, 8000);
  }

  private static stopMenuDrone(): void {
    if (!this.ctx || this.droneNodes.length === 0) return;
    const now = this.ctx.currentTime;
    // Stop LFO interval
    if (this.droneLfoId !== null) {
      window.clearInterval(this.droneLfoId);
      this.droneLfoId = null;
    }
    // Fade out and stop every layer
    this.droneNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.stop(now + 2.1);
      } catch { /* already stopped — safe to ignore */ }
    });
    this.droneNodes = [];
  }
}

export default AudioManager;
