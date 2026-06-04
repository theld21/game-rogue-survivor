import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Wall.ts — Static neon obstacle (rectangle static body + vector art).
// The collision body is the rectangle; the glow is drawn separately
// (body-vs-visual separation). Zero-asset: pure Graphics, no tilemap.
// =====================================================================

export class Wall extends Phaser.GameObjects.Rectangle {
  declare body: Phaser.Physics.Arcade.StaticBody;
  private glow!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color = COLORS.wall) {
    super(scene, x, y, w, h, color, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(15);

    // Neon edge glow drawn over the solid rect
    this.glow = scene.add.graphics().setDepth(16);
    this.glow.lineStyle(3, COLORS.wallEdge, 0.9);
    this.glow.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    this.glow.lineStyle(1.5, COLORS.cyan, 0.5);
    this.glow.strokeRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 3);
    // Inner circuit hint lines
    this.glow.lineStyle(1, COLORS.violet, 0.4);
    const step = 22;
    for (let gx = x - w / 2 + step; gx < x + w / 2; gx += step) {
      this.glow.lineBetween(gx, y - h / 2 + 4, gx, y + h / 2 - 4);
    }
  }

  destroy(fromScene?: boolean): void {
    this.glow?.destroy();
    super.destroy(fromScene);
  }
}

export default Wall;
