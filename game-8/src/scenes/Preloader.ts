import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import GameState from '../core/GameState.ts';
import AudioManager from '../core/AudioManager.ts';

// =====================================================================
// Preloader.ts — bakes all runtime textures (zero asset files) + hydrates
// the profile, then hands off to Menu.
// =====================================================================

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }
  init(): void { AudioManager.init(); }

  preload(): void {
    this.bakeSpark();
    this.bakeCloud();
    this.bakeStars();
    this.bakeVignette();

    EventBus.emit('load_progress', 0.5);
    GameState.hydrate()
      .then((p) => {
        AudioManager.setMusicVolume(p.musicVol ?? 0.45); AudioManager.setSfxVolume(p.sfxVol ?? 0.8);
        EventBus.emit('load_progress', 1);
        this.time.delayedCall(380, () => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
      })
      .catch(() => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
  }

  private bakeSpark(): void {
    const c = this.textures.createCanvas('spark', 16, 16); if (!c) return;
    const ctx = c.getContext(); const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16); c.refresh();
  }
  private bakeCloud(): void {
    const c = this.textures.createCanvas('cloud', 128, 72); if (!c) return;
    const ctx = c.getContext();
    for (let i = 0; i < 6; i++) {
      const x = 20 + Math.random() * 88, y = 24 + Math.random() * 24, r = 16 + Math.random() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    c.refresh();
  }
  private bakeStars(): void {
    const S = 512;
    const c = this.textures.createCanvas('stars', S, S); if (!c) return;
    const ctx = c.getContext();
    ctx.fillStyle = 'rgba(10,18,40,1)'; ctx.fillRect(0, 0, S, S);
    // Stars wrapped across edges so the tile repeats SEAMLESSLY.
    const star = (x: number, y: number, r: number, a: number) => {
      ctx.fillStyle = `rgba(${180 + Math.random() * 60},${200 + Math.random() * 55},255,${a})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = Math.random() * 1.4 + 0.3, a = 0.2 + Math.random() * 0.6;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if ((ox || oy) && (x + ox < -4 || x + ox > S + 4 || y + oy < -4 || y + oy > S + 4)) continue;
        star(x + ox, y + oy, r, a);
      }
    }
    c.refresh();
  }
  private bakeVignette(): void {
    const c = this.textures.createCanvas('vignette', 512, 512); if (!c) return;
    const ctx = c.getContext(); const g = ctx.createRadialGradient(256, 256, 90, 256, 256, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512); c.refresh();
  }
}
export default Preloader;
