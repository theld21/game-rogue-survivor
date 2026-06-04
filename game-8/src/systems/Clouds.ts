import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Clouds.ts — drifting cloud band for the "thousands of metres up" feel.
// A small pool of parallax cloud sprites that WRAP around the camera view
// (recycled, never created/destroyed). Wind is modulated by world events.
// =====================================================================

interface Cloud { img: Phaser.GameObjects.Image; }

export class Clouds {
  private clouds: Cloud[] = [];
  private windX = -18; private windY = 6;       // base drift
  private gustX = 0; private gustY = 0; private gustUntil = 0;

  constructor(private scene: Phaser.Scene, count = 26) {
    const cam = scene.cameras.main;
    for (let i = 0; i < count; i++) {
      const img = scene.add.image(0, 0, 'cloud')
        .setDepth(6).setScrollFactor(0.92)
        .setAlpha(0.10 + Math.random() * 0.14)
        .setScale(2 + Math.random() * 3.5)
        .setTint(COLORS.cloud)
        .setPosition(Math.random() * cam.width, Math.random() * cam.height);
      this.clouds.push({ img });
    }
  }

  /** A timed gust (e.g. whale migration) that also returns its vector for the ship. */
  gust(dirX: number, dirY: number, strength: number, ms: number): { x: number; y: number } {
    this.gustX = dirX * strength; this.gustY = dirY * strength;
    this.gustUntil = this.scene.time.now + ms;
    return { x: this.gustX, y: this.gustY };
  }
  windPush(): { x: number; y: number } {
    return this.scene.time.now < this.gustUntil ? { x: this.gustX, y: this.gustY } : { x: 0, y: 0 };
  }

  update(dt: number): void {
    const cam = this.scene.cameras.main;
    const gust = this.scene.time.now < this.gustUntil;
    const wx = this.windX + (gust ? this.gustX * 0.5 : 0);
    const wy = this.windY + (gust ? this.gustY * 0.5 : 0);
    const m = 120;
    for (const c of this.clouds) {
      c.img.x += wx * dt; c.img.y += wy * dt;
      // wrap within the (screen-space) view
      if (c.img.x < -m) c.img.x = cam.width + m; else if (c.img.x > cam.width + m) c.img.x = -m;
      if (c.img.y < -m) c.img.y = cam.height + m; else if (c.img.y > cam.height + m) c.img.y = -m;
    }
  }

  destroy(): void { this.clouds.forEach((c) => c.img.destroy()); this.clouds = []; }
}
export default Clouds;
