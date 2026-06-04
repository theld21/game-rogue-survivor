import Phaser from 'phaser';
import { SplashScreen } from '@capacitor/splash-screen';
import EventBus from '../EventBus.ts';
import GameState from '../core/GameState.ts';
import AudioManager from '../core/AudioManager.ts';

// =====================================================================
// Preloader.ts — Asset-free bootstrap.
//
// Ships zero image files. Paints a few small textures onto canvases at
// boot (particle spark, nebula tile, two star layers) and injects them
// into Phaser's cache. Hydrates the save profile and inits audio.
// =====================================================================

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }

  init(): void {
    try { SplashScreen.hide(); } catch { /* not in Capacitor shell */ }
    AudioManager.init();
  }

  preload(): void {
    this.buildTextures();
    EventBus.emit('load_progress', 0.5);

    GameState.hydrate()
      .then((profile) => {
        AudioManager.setMusicVolume(profile.musicVol ?? 0.5);
        AudioManager.setSfxVolume(profile.sfxVol ?? 0.8);
        EventBus.emit('load_progress', 1.0);
        this.time.delayedCall(500, () => {
          EventBus.emit('load_complete');
          this.scene.start('Menu');
        });
      })
      .catch(() => {
        EventBus.emit('load_complete');
        this.scene.start('Menu');
      });
  }

  private buildTextures(): void {
    this.bakeSpark();
    this.bakeNebula();
    this.bakeStars('stars_far', 90, 0.7, 1.4);
    this.bakeStars('stars_near', 45, 1.0, 2.4);
  }

  // Radial-glow particle dot
  private bakeSpark(): void {
    const c = this.textures.createCanvas('spark', 16, 16);
    if (!c) return;
    const ctx = c.getContext();
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    c.refresh();
  }

  // Soft nebula cloud tile (seamless-ish, tinted at runtime)
  private bakeNebula(): void {
    const size = 512;
    const c = this.textures.createCanvas('nebula_tile', size, size);
    if (!c) return;
    const ctx = c.getContext();
    ctx.clearRect(0, 0, size, size);
    // Layered soft blobs
    const blobs = 10;
    for (let i = 0; i < blobs; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 80 + Math.random() * 160;
      const hue = ['rgba(60,40,120,', 'rgba(20,60,120,', 'rgba(90,30,90,'][i % 3];
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, hue + '0.22)');
      grad.addColorStop(1, hue + '0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    c.refresh();
  }

  // Star layer with random points + occasional bright twinkle
  private bakeStars(key: string, count: number, baseAlpha: number, maxSize: number): void {
    const size = 512;
    const c = this.textures.createCanvas(key, size, size);
    if (!c) return;
    const ctx = c.getContext();
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = 0.4 + Math.random() * maxSize;
      const bright = Math.random() < 0.2;
      const a = baseAlpha * (0.4 + Math.random() * 0.6);
      if (bright) {
        // glow
        const grad = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
        grad.addColorStop(0, `rgba(180,230,255,${a})`);
        grad.addColorStop(1, 'rgba(180,230,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
      }
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    c.refresh();
  }
}

export default Preloader;
