export class AudioManager {
  private static audioCtx: AudioContext | null = null;
  private static musicGainNode: GainNode | null = null;
  private static sfxGainNode: GainNode | null = null;
  private static masterGainNode: GainNode | null = null;
  
  private static musicVolume: number = 0.8;
  private static sfxVolume: number = 0.9;
  
  private static sequencerIntervalId: number | null = null;
  private static musicStep: number = 0;
  
  private static activeMusicType: 'menu' | 'ingame' | null = null;
  
  // Driving Cyberpunk D-minor bass pattern (new gameplay song!)
  private static ingameBassPattern: number[] = [
    73.42, 73.42, 87.31, 87.31,   // D2, D2, F2, F2
    65.41, 65.41, 97.99, 97.99,   // C2, C2, G2, G2
    116.54, 116.54, 110.00, 110.00, // Bb2, Bb2, A2, A2
    130.81, 130.81, 110.00, 97.99  // C3, C3, A2, G2
  ];

  // Menu ambient drone chords: A minor, F major, C major, G major
  private static menuChords: number[][] = [
    [110.00, 130.81, 164.81], // A2, C3, E3 (A minor)
    [87.31,  110.00, 130.81], // F2, A2, C3 (F major)
    [65.41,  82.41,  97.99],  // C2, E2, G2 (C major)
    [97.99,  123.47, 146.83]  // G2, B2, D3 (G major)
  ];

  static init(): void {
    if (this.audioCtx) return;
    
    try {
      const AudioCtxClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        
        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.connect(this.audioCtx.destination);
        
        this.musicGainNode = this.audioCtx.createGain();
        this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.audioCtx.currentTime);
        this.musicGainNode.connect(this.masterGainNode);
        
        this.sfxGainNode = this.audioCtx.createGain();
        this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);
        this.sfxGainNode.connect(this.masterGainNode);
        
        this.setupUnlockListeners();
      }
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  private static setupUnlockListeners(): void {
    const resumeCtx = () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          console.log('AudioContext activated on iOS gesture.');
          this.removeListeners();
        });
      } else {
        this.removeListeners();
      }
    };
    
    window.addEventListener('click', resumeCtx);
    window.addEventListener('touchstart', resumeCtx);
  }

  private static removeListeners(): void {
    // Keep them just in case, but can clean up if needed
  }

  static resumeContext(): void {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  static setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.audioCtx && this.musicGainNode) {
      this.musicGainNode.gain.setValueAtTime(this.musicVolume, this.audioCtx.currentTime);
      
      // Perform immediate iOS WKWebView gain context nudge
      this.audioCtx.suspend().then(() => {
        if (this.audioCtx) this.audioCtx.resume();
      });
    }
  }

  static setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.audioCtx && this.sfxGainNode) {
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);
    }
  }

  static getMusicVolume(): number {
    return this.musicVolume;
  }

  static getSfxVolume(): number {
    return this.sfxVolume;
  }

  // --- PROCEDURAL SOUND FX SYNTHESIS ---

  static playJump(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start(now);
    osc.stop(now + 0.16);
  }

  static playDash(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.12);
    
    // Add bandpass filter to sound cyber-like
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start(now);
    osc.stop(now + 0.13);
  }

  static playExplosion(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    
    // Generate white noise for explosion debris sound
    const bufferSize = this.audioCtx.sampleRate * 0.4;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    // Base rumble oscillator
    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.35);
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxGainNode);
    
    noiseNode.start(now);
    osc.start(now);
    
    noiseNode.stop(now + 0.45);
    osc.stop(now + 0.45);
  }

  static playShard(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.setValueAtTime(1046.50, now + 0.05); // C6
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now); // E6
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.21);
    osc2.stop(now + 0.21);
  }

  static playTeleport(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.1);
    osc.frequency.linearRampToValueAtTime(450, now + 0.2);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    
    osc.start(now);
    osc.stop(now + 0.21);
  }

  static playLevelUp(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      const noteTime = now + (idx * 0.08);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      
      osc.start(noteTime);
      osc.stop(noteTime + 0.21);
    });
  }

  static playWarning(): void {
    this.resumeContext();
    if (!this.audioCtx || !this.sfxGainNode) return;
    
    const now = this.audioCtx.currentTime;
    
    // Play dual pulse warning tone
    [0, 0.12].forEach((offset) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      const playTime = now + offset;
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, playTime);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.3, playTime);
      gain.gain.linearRampToValueAtTime(0.01, playTime + 0.08);
      
      const filter = this.audioCtx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGainNode!);
      
      osc.start(playTime);
      osc.stop(playTime + 0.09);
    });
  }

  // --- PROCEDURAL MUSIC SYNTHWAVE SEQUENCER ---

  static startMusic(type: 'menu' | 'ingame', sector?: number): void {
    this.init();
    this.resumeContext();
    
    let trackIndex = 0;
    if (type === 'ingame') {
      const secVal = sector || 1;
      trackIndex = (secVal - 1) % 3;
    }
    
    // If music of same type and same track is already playing, do nothing
    if (this.sequencerIntervalId && this.activeMusicType === type) {
      if (type === 'ingame' && (this as any).activeTrackIndex === trackIndex) {
        return;
      }
      if (type === 'menu') {
        return;
      }
    }
    
    // If different type/track is playing, stop it first
    if (this.sequencerIntervalId) {
      this.stopMusic();
    }
    
    this.activeMusicType = type;
    (this as any).activeTrackIndex = trackIndex;
    this.musicStep = 0;
    
    let stepDuration = 0.8; // menu slow ambient
    if (type === 'ingame') {
      if (trackIndex === 0) stepDuration = 0.22; // Neon Voyage
      else if (trackIndex === 1) stepDuration = 0.26; // Nebula Drift
      else if (trackIndex === 2) stepDuration = 0.18; // Orbit Speedrun
    }
    
    const playStep = () => {
      if (!this.audioCtx || !this.musicGainNode) return;
      const now = this.audioCtx.currentTime;
      
      if (type === 'menu') {
        // --- AMBIENT MENU MUSIC ---
        // Play slow chord pad every 8 steps
        if (this.musicStep % 8 === 0) {
          const chordIndex = Math.floor(this.musicStep / 8) % this.menuChords.length;
          const freqs = this.menuChords[chordIndex];
          
          freqs.forEach(freq => {
            const osc = this.audioCtx!.createOscillator();
            const gain = this.audioCtx!.createGain();
            const filter = this.audioCtx!.createBiquadFilter();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            filter.type = 'lowpass';
            filter.Q.value = 1;
            filter.frequency.setValueAtTime(120, now);
            filter.frequency.exponentialRampToValueAtTime(320, now + 0.4);
            
            // Slow attack and long release
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04, now + 0.2); // soft pad
            gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 3.5); // long spillover
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGainNode!);
            
            osc.start(now);
            osc.stop(now + stepDuration * 4);
          });
        }
        
        // Sparkling space bell/ping on off-beats (randomly)
        if (this.musicStep % 4 === 2 && Math.random() < 0.35) {
          const bellOsc = this.audioCtx!.createOscillator();
          const bellGain = this.audioCtx!.createGain();
          
          // Random high frequency in scale
          const scale = [1318.51, 1567.98, 1760.00, 2093.00, 2349.32]; // E6, G6, A6, C7, D7
          const freq = scale[Math.floor(Math.random() * scale.length)];
          
          bellOsc.type = 'sine';
          bellOsc.frequency.setValueAtTime(freq, now);
          
          bellGain.gain.setValueAtTime(0, now);
          bellGain.gain.linearRampToValueAtTime(0.015, now + 0.02);
          bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
          
          bellOsc.connect(bellGain);
          bellGain.connect(this.musicGainNode!);
          
          bellOsc.start(now);
          bellOsc.stop(now + 0.3);
        }
      } else {
        // --- GAMEPLAY MUSIC TRACKS ---
        if (trackIndex === 0) {
          // --- TRACK 1: Neon Voyage (Cyberpunk Synthwave) ---
          const bassOsc = this.audioCtx!.createOscillator();
          const bassGain = this.audioCtx!.createGain();
          const freqIndex = this.musicStep % this.ingameBassPattern.length;
          let freq = this.ingameBassPattern[freqIndex];
          
          // Add octaves on beat 2 & 6 of 8 steps
          if (this.musicStep % 8 === 2 || this.musicStep % 8 === 6) {
            freq *= 2;
          }
          
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(freq, now);
          
          const filter = this.audioCtx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.value = 2.5;
          filter.frequency.setValueAtTime(140, now);
          filter.frequency.exponentialRampToValueAtTime(420, now + 0.12);
          
          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration - 0.02);
          
          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.musicGainNode!);
          
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration);
          
          // Crisp hi-hat on off beats
          if (this.musicStep % 4 === 2) {
            const hhBuffer = this.audioCtx!.createBuffer(1, this.audioCtx!.sampleRate * 0.025, this.audioCtx!.sampleRate);
            const hhData = hhBuffer.getChannelData(0);
            for (let i = 0; i < hhData.length; i++) {
              hhData[i] = Math.random() * 2 - 1;
            }
            const hhSource = this.audioCtx!.createBufferSource();
            hhSource.buffer = hhBuffer;
            
            const hhFilter = this.audioCtx!.createBiquadFilter();
            hhFilter.type = 'highpass';
            hhFilter.frequency.value = 9000;
            
            const hhGain = this.audioCtx!.createGain();
            hhGain.gain.setValueAtTime(0.018, now);
            hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
            
            hhSource.connect(hhFilter);
            hhFilter.connect(hhGain);
            hhGain.connect(this.musicGainNode!);
            
            hhSource.start(now);
            hhSource.stop(now + 0.035);
          }
          
          // Synth cyberpunk melody lines
          if (this.musicStep % 16 === 8 || this.musicStep % 16 === 12 || this.musicStep % 16 === 14) {
            const melOsc = this.audioCtx!.createOscillator();
            const melGain = this.audioCtx!.createGain();
            const filterMel = this.audioCtx!.createBiquadFilter();
            
            // D minor key melodies
            const melodies = [587.33, 698.46, 880.00, 783.99, 523.25]; // D5, F5, A5, G5, C5
            const melFreq = melodies[(Math.floor(freqIndex / 2) + (this.musicStep % 4)) % melodies.length];
            
            melOsc.type = 'triangle';
            melOsc.frequency.setValueAtTime(melFreq, now);
            
            filterMel.type = 'bandpass';
            filterMel.frequency.value = 1000;
            
            melGain.gain.setValueAtTime(0.05, now);
            melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            
            melOsc.connect(filterMel);
            filterMel.connect(melGain);
            melGain.connect(this.musicGainNode!);
            
            melOsc.start(now);
            melOsc.stop(now + 0.35);
          }
        }
        else if (trackIndex === 1) {
          // --- TRACK 2: Nebula Drift (Progressive Space Chill) ---
          const bassOsc = this.audioCtx!.createOscillator();
          const bassGain = this.audioCtx!.createGain();
          
          const chillBass = [
            55.00, 55.00, 82.41, 82.41,
            48.99, 48.99, 73.42, 73.42,
            43.65, 43.65, 65.41, 65.41,
            48.99, 48.99, 61.74, 61.74
          ];
          const freqIndex = this.musicStep % chillBass.length;
          const freq = chillBass[freqIndex];
          
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(freq, now);
          
          const filter = this.audioCtx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(100, now);
          
          bassGain.gain.setValueAtTime(0.24, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration - 0.02);
          
          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.musicGainNode!);
          
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration);
          
          // Soft Hi-Hat
          if (this.musicStep % 4 === 2) {
            const hhBuffer = this.audioCtx!.createBuffer(1, this.audioCtx!.sampleRate * 0.02, this.audioCtx!.sampleRate);
            const hhData = hhBuffer.getChannelData(0);
            for (let i = 0; i < hhData.length; i++) hhData[i] = Math.random() * 1.5 - 0.75;
            
            const hhSource = this.audioCtx!.createBufferSource();
            hhSource.buffer = hhBuffer;
            
            const hhFilter = this.audioCtx!.createBiquadFilter();
            hhFilter.type = 'highpass';
            hhFilter.frequency.value = 10000;
            
            const hhGain = this.audioCtx!.createGain();
            hhGain.gain.setValueAtTime(0.01, now);
            hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            
            hhSource.connect(hhFilter);
            hhFilter.connect(hhGain);
            hhGain.connect(this.musicGainNode!);
            
            hhSource.start(now);
            hhSource.stop(now + 0.025);
          }
          
          // Soft arpeggiator melody
          if (this.musicStep % 4 === 0 || this.musicStep % 4 === 3) {
            const melOsc = this.audioCtx!.createOscillator();
            const melGain = this.audioCtx!.createGain();
            
            const scale = [440.00, 523.25, 659.25, 783.99, 880.00];
            const melFreq = scale[this.musicStep % scale.length];
            
            melOsc.type = 'sine';
            melOsc.frequency.setValueAtTime(melFreq, now);
            
            melGain.gain.setValueAtTime(0.035, now);
            melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            melOsc.connect(melGain);
            melGain.connect(this.musicGainNode!);
            
            melOsc.start(now);
            melOsc.stop(now + 0.52);
          }
        }
        else {
          // --- TRACK 3: Orbit Speedrun (Acid Techno / Energetic Cyberpunk) ---
          const bassOsc = this.audioCtx!.createOscillator();
          const bassGain = this.audioCtx!.createGain();
          
          const acidBass = [
            48.99, 48.99, 58.27, 48.99,
            65.41, 48.99, 73.42, 58.27,
            77.78, 77.78, 87.31, 77.78,
            73.42, 65.41, 58.27, 48.99
          ];
          const freqIndex = this.musicStep % acidBass.length;
          let freq = acidBass[freqIndex];
          
          if (this.musicStep % 16 === 4 || this.musicStep % 16 === 12) {
            freq *= 2;
          }
          
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(freq, now);
          
          const filter = this.audioCtx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.value = 5.0;
          filter.frequency.setValueAtTime(180, now);
          filter.frequency.exponentialRampToValueAtTime(750, now + 0.05);
          filter.frequency.exponentialRampToValueAtTime(150, now + stepDuration - 0.01);
          
          bassGain.gain.setValueAtTime(0.16, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration - 0.01);
          
          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.musicGainNode!);
          
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration);
          
          // Hi-Hat
          const hhBuffer = this.audioCtx!.createBuffer(1, this.audioCtx!.sampleRate * 0.02, this.audioCtx!.sampleRate);
          const hhData = hhBuffer.getChannelData(0);
          for (let i = 0; i < hhData.length; i++) hhData[i] = Math.random() * 2 - 1;
          
          const hhSource = this.audioCtx!.createBufferSource();
          hhSource.buffer = hhBuffer;
          
          const hhFilter = this.audioCtx!.createBiquadFilter();
          hhFilter.type = 'highpass';
          hhFilter.frequency.value = 11000;
          
          const hhGain = this.audioCtx!.createGain();
          const hhVolume = this.musicStep % 2 === 0 ? 0.008 : 0.022;
          hhGain.gain.setValueAtTime(hhVolume, now);
          hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          
          hhSource.connect(hhFilter);
          hhFilter.connect(hhGain);
          hhGain.connect(this.musicGainNode!);
          
          hhSource.start(now);
          hhSource.stop(now + 0.025);
          
          // Snare on beat 2 and 4 (step 4, 12, 20, 28)
          if (this.musicStep % 8 === 4) {
            const snareBuffer = this.audioCtx!.createBuffer(1, this.audioCtx!.sampleRate * 0.06, this.audioCtx!.sampleRate);
            const snareData = snareBuffer.getChannelData(0);
            for (let i = 0; i < snareData.length; i++) snareData[i] = Math.random() * 2 - 1;
            
            const snareSource = this.audioCtx!.createBufferSource();
            snareSource.buffer = snareBuffer;
            
            const snareFilter = this.audioCtx!.createBiquadFilter();
            snareFilter.type = 'bandpass';
            snareFilter.frequency.value = 1500;
            
            const snareGain = this.audioCtx!.createGain();
            snareGain.gain.setValueAtTime(0.04, now);
            snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            snareSource.connect(snareFilter);
            snareFilter.connect(snareGain);
            snareGain.connect(this.musicGainNode!);
            
            snareSource.start(now);
            snareSource.stop(now + 0.065);
          }
          
          // High speed melodies
          if (this.musicStep % 16 >= 8 && this.musicStep % 4 !== 2) {
            const melOsc = this.audioCtx!.createOscillator();
            const melGain = this.audioCtx!.createGain();
            
            const scale = [392.00, 466.16, 523.25, 587.33, 783.99]; // G4, Bb4, C5, D5, G5
            const melFreq = scale[this.musicStep % scale.length];
            
            melOsc.type = 'sawtooth';
            melOsc.frequency.setValueAtTime(melFreq, now);
            
            const melFilter = this.audioCtx!.createBiquadFilter();
            melFilter.type = 'lowpass';
            melFilter.frequency.setValueAtTime(800, now);
            
            melGain.gain.setValueAtTime(0.02, now);
            melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            melOsc.connect(melFilter);
            melFilter.connect(melGain);
            melGain.connect(this.musicGainNode!);
            
            melOsc.start(now);
            melOsc.stop(now + 0.16);
          }
        }
      }
      
      this.musicStep++;
    };
    
    const intervalMs = stepDuration * 1000;
    this.sequencerIntervalId = window.setInterval(playStep, intervalMs);
    playStep();
  }

  static stopMusic(): void {
    if (this.sequencerIntervalId) {
      window.clearInterval(this.sequencerIntervalId);
      this.sequencerIntervalId = null;
    }
    this.activeMusicType = null;
  }
}
export default AudioManager;
