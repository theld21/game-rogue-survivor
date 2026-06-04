import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import { COLORS, CSS, EVENTS } from '../config.ts';
import Clouds from './Clouds.ts';

// =====================================================================
// WorldEvents.ts — emergent events fired every EVENTS.interval: whale
// migration (tailwind gust + drifting whales) or aether wave (radar jam).
// Extracted from World; exposes jammed() for the radar feed.
// =====================================================================

export class WorldEvents {
  private cd = EVENTS.interval;
  private jammedUntil = 0;

  constructor(private scene: Phaser.Scene, private clouds: Clouds) {}
  reset(): void { this.cd = EVENTS.interval; this.jammedUntil = 0; }
  jammed(now: number): boolean { return now < this.jammedUntil; }

  update(dt: number, ship: { x: number; y: number }): void {
    this.cd -= dt * 1000;
    if (this.cd > 0) return;
    this.cd = EVENTS.interval;
    if (Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      this.clouds.gust(Math.cos(a), Math.sin(a), 260, EVENTS.windMs);
      EventBus.emit('event', { title: 'WHALE MIGRATION', desc: 'A pod of sky-whales stirs a powerful tailwind.', color: CSS.aether });
      this.spawnWhales(a, ship);
    } else {
      this.jammedUntil = this.scene.time.now + EVENTS.jamMs;
      EventBus.emit('event', { title: 'AETHER WAVE', desc: 'A surge scrambles your radar for 30s.', color: CSS.leviathan });
      this.scene.cameras.main.flash(400, 160, 110, 255);
    }
    AudioManager.event();
  }

  private spawnWhales(dir: number, ship: { x: number; y: number }): void {
    for (let i = 0; i < 3; i++) {
      const perp = dir + Math.PI / 2; const off = (i - 1) * 160;
      const sx = ship.x - Math.cos(dir) * 700 + Math.cos(perp) * off;
      const sy = ship.y - Math.sin(dir) * 700 + Math.sin(perp) * off;
      const w = this.scene.add.graphics().setDepth(8);
      w.fillStyle(COLORS.storm, 0.5); w.fillEllipse(0, 0, 120, 50);
      w.fillStyle(COLORS.aetherHot, 0.4); w.fillEllipse(-30, 0, 60, 30);
      w.fillTriangle(60, 0, 90, -24, 90, 24);
      w.setPosition(sx, sy).setRotation(dir);
      this.scene.tweens.add({ targets: w, x: sx + Math.cos(dir) * 1500, y: sy + Math.sin(dir) * 1500, duration: 14000, ease: 'sine.inOut', onComplete: () => w.destroy() });
    }
  }
}
export default WorldEvents;
