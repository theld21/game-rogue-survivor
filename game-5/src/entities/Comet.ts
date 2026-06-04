import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Comet.ts — Fast hazard that streaks across the field (level 3+).
//
// Moves on a diagonal far quicker than asteroids. Colliding with the ship
// deals heavy damage, but shooting it pays a big credit bonus. A glowing
// particle tail sells the speed. Pure-vector core, baked 'spark' tail.
// =====================================================================

export class Comet extends Phaser.GameObjects.Container {
  radius = 22;
  vx: number;
  vy: number;
  bonus: number;
  dead = false;

  private core!: Phaser.GameObjects.Graphics;
  private tail!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, bonus: number) {
    super(scene, x, y);
    this.vx = vx;
    this.vy = vy;
    this.bonus = bonus;
    scene.add.existing(this);
    this.setDepth(24);

    this.buildTail();
    this.buildCore();
  }

  private buildTail(): void {
    // Tail points opposite to travel direction
    const ang = Math.atan2(this.vy, this.vx) + Math.PI;
    this.tail = this.scene.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 70 },
      angle: { min: Phaser.Math.RadToDeg(ang) - 12, max: Phaser.Math.RadToDeg(ang) + 12 },
      scale: { start: 0.7, end: 0 },
      lifespan: { min: 240, max: 460 },
      quantity: 2,
      frequency: 16,
      blendMode: 'ADD',
      tint: [COLORS.ice, COLORS.cyan, COLORS.white],
      alpha: { start: 0.9, end: 0 },
    });
    this.tail.setDepth(23);
    this.add(this.tail);
  }

  private buildCore(): void {
    const g = this.scene.add.graphics();
    // Glow halo
    g.fillStyle(COLORS.cyan, 0.2);
    g.fillCircle(0, 0, 26);
    // Icy core
    g.fillStyle(COLORS.white, 0.95);
    g.fillCircle(0, 0, 11);
    g.fillStyle(COLORS.ice, 1);
    g.fillCircle(0, 0, 7);
    g.lineStyle(2, COLORS.cyan, 1);
    g.strokeCircle(0, 0, 12);
    // Crystalline spikes
    g.lineStyle(2, COLORS.white, 0.9);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 17, Math.sin(a) * 17);
    }
    this.core = g;
    this.add(g);
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.core.rotation += 3 * dt;
  }

  /** Stop emitting and fade (called on hit or off-screen). Idempotent. */
  kill(): void {
    if (this.dead) return;          // guard against double-kill (laser + collision same frame)
    this.dead = true;
    this.tail.stop();
    // Let existing tail particles fade, then destroy
    this.scene.time.delayedCall(500, () => this.destroy());
  }
}

export default Comet;
