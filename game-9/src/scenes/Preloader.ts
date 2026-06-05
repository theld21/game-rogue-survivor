import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import GameState from '../core/GameState.ts';
import AudioManager from '../core/AudioManager.ts';
import { LIGHT } from '../config.ts';

// =====================================================================
// Preloader.ts — bakes every runtime texture (zero asset files): bubble,
// flashlight cone gradient, soft glow. Then hydrates the profile → Menu.
// =====================================================================

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }
  init(): void { AudioManager.init(); }

  preload(): void {
    this.bakeBubble();
    this.bakeGlow();
    this.bakeCone();
    EventBus.emit('load_progress', 0.5);
    GameState.hydrate()
      .then((p) => {
        AudioManager.setMusicVolume(p.musicVol ?? 0.4); AudioManager.setSfxVolume(p.sfxVol ?? 0.8);
        EventBus.emit('load_progress', 1);
        this.time.delayedCall(360, () => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
      })
      .catch(() => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
  }

  private bakeBubble(): void {
    const c = this.textures.createCanvas('bubble', 24, 24); if (!c) return;
    const ctx = c.getContext();
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(180,240,255,0.5)'); g.addColorStop(1, 'rgba(180,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 24, 24);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(12, 12, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(9, 9, 2, 0, Math.PI * 2); ctx.fill();
    c.refresh();
  }

  private bakeGlow(): void {
    const S = 256; const c = this.textures.createCanvas('glow', S, S); if (!c) return;
    const ctx = c.getContext(); const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.85)'); g.addColorStop(0.85, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); c.refresh();
  }

  // Soft flashlight cone — apex at left-centre, fanning right (alpha = reveal strength).
  private bakeCone(): void {
    const W = 400, H = 360; const c = this.textures.createCanvas('cone', W, H); if (!c) return;
    const ctx = c.getContext(); const img = ctx.createImageData(W, H); const d = img.data;
    const ax = 24, ay = H / 2, half = LIGHT.halfAngle, maxD = W - ax;
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const dx = px - ax, dy = py - ay; const idx = (py * W + px) * 4;
        d[idx] = 255; d[idx + 1] = 245; d[idx + 2] = 200;
        if (dx <= 0) { d[idx + 3] = 0; continue; }
        const ang = Math.abs(Math.atan2(dy, dx)); const dist = Math.hypot(dx, dy);
        if (ang > half || dist > maxD) { d[idx + 3] = 0; continue; }
        const angFall = 1 - Math.pow(ang / half, 1.5);
        const distFall = Math.pow(1 - dist / maxD, 0.7);
        d[idx + 3] = Math.max(0, Math.min(255, Math.round(255 * angFall * distFall)));
      }
    }
    ctx.putImageData(img, 0, 0); c.refresh();
  }
}
export default Preloader;
