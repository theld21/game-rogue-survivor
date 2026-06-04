import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Pool.ts — BulletPool (zero-GC). Player + enemy fire recycle pooled
// Images; collisions are distance-checked by the World.
// =====================================================================

interface Bullet { img: Phaser.GameObjects.Image; active: boolean; x: number; y: number; vx: number; vy: number; life: number; dmg: number; team: 'player' | 'enemy'; }

export class BulletPool {
  private pool: Bullet[] = [];
  constructor(scene: Phaser.Scene, size = 140) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, 'spark').setActive(false).setVisible(false).setDepth(45).setScale(0.6);
      this.pool.push({ img, active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, team: 'player' });
    }
  }
  fire(x: number, y: number, angle: number, speed: number, lifeMs: number, dmg: number, team: 'player' | 'enemy', tint?: number): void {
    const b = this.pool.find((p) => !p.active); if (!b) return;
    b.active = true; b.x = x; b.y = y; b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
    b.life = lifeMs / 1000; b.dmg = dmg; b.team = team;
    b.img.setActive(true).setVisible(true).setPosition(x, y)
      .setTint(tint ?? (team === 'player' ? COLORS.aetherHot : COLORS.ember)).setScale(team === 'player' ? (tint ? 0.85 : 0.7) : 0.85);
  }
  update(dt: number): void {
    for (const b of this.pool) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) { this.kill(b); continue; }
      b.img.setPosition(b.x, b.y);
    }
  }
  active(): Bullet[] { return this.pool.filter((b) => b.active); }
  kill(b: Bullet): void { b.active = false; b.img.setActive(false).setVisible(false); }
  destroy(): void { this.pool.forEach((b) => b.img.destroy()); this.pool = []; }
}
