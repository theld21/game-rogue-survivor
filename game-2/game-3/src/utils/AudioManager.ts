export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static musicGain: GainNode | null = null;
  private static sfxGain: GainNode | null = null;
  private static masterGain: GainNode | null = null;
  private static musicVol = 0.75;
  private static sfxVol   = 0.85;
  private static seqId: number | null = null;
  private static step = 0;
  private static activeType: 'menu' | 'ingame' | null = null;

  // ------ Ingame bass patterns (space minor) ------
  private static readonly INGAME_BASS: number[] = [
    65.41, 65.41, 77.78, 77.78,
    58.27, 58.27, 87.31, 87.31,
    97.99, 97.99, 87.31, 87.31,
    73.42, 65.41, 55.00, 58.27,
  ];

  // ------ Menu ambient chord pads ------
  private static readonly MENU_CHORDS: number[][] = [
    [110.00, 138.59, 164.81],
    [87.31,  110.00, 130.81],
    [97.99,  123.47, 146.83],
    [73.42,  92.50,  110.00],
  ];

  static init(musicVol = 0.75, sfxVol = 0.85): void {
    if (this.ctx) return;
    this.musicVol = musicVol;
    this.sfxVol   = sfxVol;
    try {
      const Cls = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx         = new Cls();
      this.masterGain  = this.ctx.createGain();
      this.musicGain   = this.ctx.createGain();
      this.sfxGain     = this.ctx.createGain();
      this.musicGain.gain.value = musicVol;
      this.sfxGain.gain.value   = sfxVol;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this._setupUnlock();
    } catch { /* no audio */ }
  }

  private static _setupUnlock(): void {
    const unlock = (): void => {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    };
    window.addEventListener('click', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  static resumeContext(): void {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  static setMusicVolume(v: number): void {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVol;
  }
  static setSfxVolume(v: number): void {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVol;
  }
  static getMusicVolume(): number { return this.musicVol; }
  static getSfxVolume():   number { return this.sfxVol; }

  // -------- SFX --------
  static playSend(): void {
    this._sfx((ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.13);
    });
  }

  static playCapture(): void {
    this._sfx((ctx, out, t) => {
      [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const nt   = t + i * 0.07;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.2, nt);
        gain.gain.exponentialRampToValueAtTime(0.001, nt + 0.18);
        osc.connect(gain); gain.connect(out);
        osc.start(nt); osc.stop(nt + 0.2);
      });
    });
  }

  static playSupernova(): void {
    this._sfx((ctx, out, t) => {
      const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
      const src  = ctx.createBufferSource();
      const filt = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buf;
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1200, t);
      filt.frequency.exponentialRampToValueAtTime(100, t + 0.5);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      src.connect(filt); filt.connect(gain); gain.connect(out);
      const osc  = ctx.createOscillator();
      const og   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
      og.gain.setValueAtTime(0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(og); og.connect(out);
      src.start(t); src.stop(t + 0.65);
      osc.start(t); osc.stop(t + 0.55);
    });
  }

  static playPulsar(): void {
    this._sfx((ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.3);
    });
  }

  static playWin(): void {
    this._sfx((ctx, out, t) => {
      [392, 523, 659, 784].forEach((f, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const nt   = t + i * 0.1;
        osc.type = 'triangle';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.25, nt);
        gain.gain.exponentialRampToValueAtTime(0.001, nt + 0.35);
        osc.connect(gain); gain.connect(out);
        osc.start(nt); osc.stop(nt + 0.4);
      });
    });
  }

  static playLose(): void {
    this._sfx((ctx, out, t) => {
      [392, 330, 262, 196].forEach((f, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const nt   = t + i * 0.12;
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.2, nt);
        gain.gain.exponentialRampToValueAtTime(0.001, nt + 0.3);
        osc.connect(gain); gain.connect(out);
        osc.start(nt); osc.stop(nt + 0.35);
      });
    });
  }

  static playBuy(): void {
    this._sfx((ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1046, t + 0.06);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.22);
    });
  }

  static playError(): void {
    this._sfx((ctx, out, t) => {
      [0, 0.1].forEach(off => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 120;
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.25, t + off);
        gain.gain.exponentialRampToValueAtTime(0.001, t + off + 0.08);
        osc.connect(gain); gain.connect(out);
        osc.start(t + off); osc.stop(t + off + 0.1);
      });
    });
  }

  // -------- Music --------
  static startMusic(type: 'menu' | 'ingame'): void {
    this.resumeContext();
    if (this.seqId && this.activeType === type) return;
    if (this.seqId) this.stopMusic();
    this.activeType = type;
    this.step = 0;
    const bpm   = type === 'menu' ? 55  : 110;
    const stepMs = (60000 / bpm) / 2; // 8th notes

    const tick = (): void => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      if (type === 'menu') this._menuTick(t, stepMs / 1000);
      else                 this._ingameTick(t, stepMs / 1000);
      this.step++;
    };
    this.seqId = window.setInterval(tick, stepMs);
    tick();
  }

  static stopMusic(): void {
    if (this.seqId) { window.clearInterval(this.seqId); this.seqId = null; }
    this.activeType = null;
  }

  private static _menuTick(t: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    if (this.step % 8 === 0) {
      const chord = this.MENU_CHORDS[Math.floor(this.step / 8) % this.MENU_CHORDS.length];
      chord.forEach(freq => {
        const osc  = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 7);
        osc.connect(gain); gain.connect(this.musicGain!);
        osc.start(t); osc.stop(t + dur * 8);
      });
    }
    if (this.step % 3 === 2 && Math.random() < 0.4) {
      const scale = [1318, 1568, 1760, 2093];
      const osc  = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = scale[Math.floor(Math.random() * scale.length)];
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.012, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain); gain.connect(this.musicGain!);
      osc.start(t); osc.stop(t + 0.32);
    }
  }

  private static _ingameTick(t: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const freq = this.INGAME_BASS[this.step % this.INGAME_BASS.length];
    const bassF = (this.step % 8 === 3 || this.step % 8 === 7) ? freq * 2 : freq;

    const osc  = this.ctx!.createOscillator();
    const filt = this.ctx!.createBiquadFilter();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = bassF;
    filt.type = 'lowpass'; filt.Q.value = 3;
    filt.frequency.setValueAtTime(160, t);
    filt.frequency.exponentialRampToValueAtTime(500, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur - 0.01);
    osc.connect(filt); filt.connect(gain); gain.connect(this.musicGain!);
    osc.start(t); osc.stop(t + dur);

    // Hi-hat on offbeats
    if (this.step % 4 === 2) {
      const buf = this.ctx!.createBuffer(1, Math.floor(this.ctx!.sampleRate * 0.025), this.ctx!.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src  = this.ctx!.createBufferSource();
      const hf   = this.ctx!.createBiquadFilter();
      const hg   = this.ctx!.createGain();
      src.buffer = buf;
      hf.type = 'highpass'; hf.frequency.value = 9000;
      hg.gain.setValueAtTime(0.015, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      src.connect(hf); hf.connect(hg); hg.connect(this.musicGain!);
      src.start(t); src.stop(t + 0.03);
    }

    // Melody line
    if (this.step % 16 === 8 || this.step % 16 === 10 || this.step % 16 === 14) {
      const scale = [587, 698, 880, 784, 523];
      const mo   = this.ctx!.createOscillator();
      const mg   = this.ctx!.createGain();
      mo.type = 'triangle';
      mo.frequency.value = scale[(this.step >> 1) % scale.length];
      mg.gain.setValueAtTime(0.045, t); mg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      mo.connect(mg); mg.connect(this.musicGain!);
      mo.start(t); mo.stop(t + 0.32);
    }
  }

  private static _sfx(fn: (ctx: AudioContext, out: GainNode, t: number) => void): void {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;
    fn(this.ctx, this.sfxGain, this.ctx.currentTime);
  }
}

export default AudioManager;
