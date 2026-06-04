import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// WindZone.ts — Rectangular region that applies a horizontal push to any
// body inside it. No collision body; the scene tests containment and adds
// acceleration. Visual = drifting arrow streaks.
// =====================================================================

export class WindZone extends Phaser.GameObjects.Container {
  readonly rect: Phaser.Geom.Rectangle;
  readonly accelX: number;
  private streaks!: Phaser.GameObjects.Graphics;
  private tween?: Phaser.Tweens.Tween;
  private zw: number;
  private zh: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, accelX: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(11);
    this.accelX = accelX;
    this.zw = w; this.zh = h;
    this.rect = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);

    // Soft tinted field
    const field = scene.add.graphics();
    field.fillStyle(COLORS.cyan, 0.06);
    field.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    field.lineStyle(1, COLORS.cyan, 0.2);
    field.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.add(field);

    this.streaks = scene.add.graphics();
    this.add(this.streaks);
    const dir = Math.sign(accelX) || 1;
    this.tween = scene.tweens.addCounter({
      from: 0, to: 1, duration: 900, repeat: -1,
      onUpdate: (tw) => {
        if (!this.streaks.active) return;
        const t = tw.getValue() ?? 0;
        this.streaks.clear();
        this.streaks.lineStyle(2, COLORS.cyan, 0.35);
        for (let i = 0; i < 5; i++) {
          const yy = -h / 2 + 12 + (i / 5) * (h - 20);
          const sx = -w / 2 + ((t + i * 0.2) % 1) * (w - 24) * dir + (dir < 0 ? w - 24 : 0);
          this.streaks.lineBetween(sx, yy, sx + 16 * dir, yy);
          this.streaks.lineBetween(sx + 16 * dir, yy, sx + 10 * dir, yy - 4);
          this.streaks.lineBetween(sx + 16 * dir, yy, sx + 10 * dir, yy + 4);
        }
      },
    });
  }

  contains(x: number, y: number): boolean { return this.rect.contains(x, y); }

  destroy(fromScene?: boolean): void {
    this.tween?.stop();
    super.destroy(fromScene);
  }
}

export default WindZone;
