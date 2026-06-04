import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Mover.ts — Moving platform hazard (kinematic: immovable body that
// oscillates horizontally). Drone/cargo collide with it like a wall.
// Body is the rectangle; neon visual follows it.
// =====================================================================

export class Mover extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.Body;
  private baseX: number;
  private range: number;
  private speed: number;
  private phase: number;
  private glow!: Phaser.GameObjects.Graphics;
  private hw: number;
  private hh: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, range: number, speed: number, phase: number) {
    super(scene, x, y, w, h, COLORS.orange, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.baseX = x; this.range = range; this.speed = speed; this.phase = phase;
    this.hw = w / 2; this.hh = h / 2;
    // Carry direction seeded by phase; physics integrates velocity → position.
    this.body.setVelocityX(Math.cos(phase) >= 0 ? speed : -speed);

    this.glow = scene.add.graphics().setDepth(16);
    this.redrawGlow(x, y);
  }

  private redrawGlow(cx: number, cy: number): void {
    const g = this.glow; g.clear();
    g.lineStyle(3, COLORS.yellow, 0.9);
    g.strokeRoundedRect(cx - this.hw, cy - this.hh, this.hw * 2, this.hh * 2, 4);
    g.lineStyle(1.5, COLORS.orange, 0.6);
    g.lineBetween(cx - this.hw + 4, cy, cx + this.hw - 4, cy);
  }

  update(): void {
    // Reverse at the patrol bounds (physics integrates velocity → no drift).
    if (this.x >= this.baseX + this.range && this.body.velocity.x > 0) this.body.setVelocityX(-this.speed);
    else if (this.x <= this.baseX - this.range && this.body.velocity.x < 0) this.body.setVelocityX(this.speed);
    this.redrawGlow(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}

export default Mover;
