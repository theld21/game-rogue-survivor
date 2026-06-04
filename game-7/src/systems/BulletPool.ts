import Phaser from 'phaser';
import { COLORS, ENEMIES } from '../config.ts';

// =====================================================================
// BulletPool.ts — reusable kinematic energy bolts. Moves by the shared
// slow-mo dt so bullets crawl when time is slowed. One Graphics per bolt.
// =====================================================================

export interface Bolt { active: boolean; x: number; y: number; vx: number; vy: number; gfx: Phaser.GameObjects.Graphics; }

export class BulletPool {
  private bolts: Bolt[] = [];
  private readonly MAX = 40;
  constructor(private scene: Phaser.Scene) {}

  fire(x: number, y: number, angle: number): void {
    let b = this.bolts.find((o) => !o.active);
    if (!b) {
      if (this.bolts.length >= this.MAX) return;
      b = { active: false, x: 0, y: 0, vx: 0, vy: 0, gfx: this.scene.add.graphics().setDepth(34) };
      this.bolts.push(b);
    }
    b.active = true; b.x = x; b.y = y;
    b.vx = Math.cos(angle) * ENEMIES.ranged.bulletSpeed;
    b.vy = Math.sin(angle) * ENEMIES.ranged.bulletSpeed;
    b.gfx.setVisible(true);
  }

  active(): Bolt[] { return this.bolts.filter((b) => b.active); }
  kill(b: Bolt): void { b.active = false; b.gfx.clear(); b.gfx.setVisible(false); }

  update(dt: number, bounds: Phaser.Geom.Rectangle): void {
    for (const b of this.bolts) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -20 || b.x > bounds.width + 20 || b.y < -20 || b.y > bounds.height + 20) { this.kill(b); continue; }
      const g = b.gfx; g.clear();
      g.fillStyle(COLORS.amber, 0.3); g.fillCircle(b.x, b.y, 8);
      g.fillStyle(COLORS.amber, 1); g.fillCircle(b.x, b.y, 4);
      g.fillStyle(COLORS.white, 1); g.fillCircle(b.x, b.y, 1.8);
    }
  }

  destroy(): void { this.bolts.forEach((b) => b.gfx.destroy()); this.bolts = []; }
}

export default BulletPool;
