import Phaser from 'phaser';
import { COLORS, GUN } from '../config.ts';

// =====================================================================
// LaserPool.ts — Lightweight reusable laser-bolt pool.
//
// Each bolt is a short neon streak drawn with Graphics, moved kinematically
// along its launch angle. The scene resolves bolt↔asteroid hits with a
// manual distance check (no arcade bodies — matches the project pattern).
// =====================================================================

export interface Bolt {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class LaserPool {
  private scene: Phaser.Scene;
  private bolts: Bolt[] = [];
  private readonly MAX = 40;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  fire(x: number, y: number, angleRad: number, damage: number): void {
    let bolt = this.bolts.find((b) => !b.active);
    if (!bolt) {
      if (this.bolts.length >= this.MAX) return;
      bolt = {
        active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, damage: 0,
        gfx: this.scene.add.graphics().setDepth(35),
      };
      this.bolts.push(bolt);
    }
    bolt.active = true;
    bolt.x = x; bolt.y = y;
    bolt.angle = angleRad;
    bolt.vx = Math.sin(angleRad) * GUN.laserSpeed;
    bolt.vy = -Math.cos(angleRad) * GUN.laserSpeed;
    bolt.damage = damage;
    bolt.gfx.setVisible(true);
  }

  /** Returns currently-active bolts for collision checks. */
  active(): Bolt[] {
    return this.bolts.filter((b) => b.active);
  }

  kill(bolt: Bolt): void {
    bolt.active = false;
    bolt.gfx.clear();
    bolt.gfx.setVisible(false);
  }

  update(dt: number, bounds: Phaser.Geom.Rectangle): void {
    for (const b of this.bolts) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Cull off-screen
      if (b.y < bounds.y - 40 || b.x < bounds.x - 40 || b.x > bounds.right + 40 || b.y > bounds.bottom + 40) {
        this.kill(b);
        continue;
      }
      this.drawBolt(b);
    }
  }

  private drawBolt(b: Bolt): void {
    const g = b.gfx;
    g.clear();
    const len = 26;
    const tx = b.x - Math.sin(b.angle) * len;
    const ty = b.y + Math.cos(b.angle) * len;
    // Outer glow
    g.lineStyle(7, COLORS.cyan, 0.25);
    g.lineBetween(tx, ty, b.x, b.y);
    // Mid
    g.lineStyle(3.5, COLORS.cyan, 0.8);
    g.lineBetween(tx, ty, b.x, b.y);
    // Hot core
    g.lineStyle(1.5, COLORS.white, 1);
    g.lineBetween(tx, ty, b.x, b.y);
    // Head spark
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(b.x, b.y, 2.5);
  }

  destroy(): void {
    this.bolts.forEach((b) => b.gfx.destroy());
    this.bolts = [];
  }
}

export default LaserPool;
