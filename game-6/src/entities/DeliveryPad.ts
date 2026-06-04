import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// DeliveryPad.ts — Landing zone at the bottom. Overlap + low speed = win.
// Pure visual + a geometry rect the scene tests cargo against.
// =====================================================================

export class DeliveryPad extends Phaser.GameObjects.Container {
  readonly zone: Phaser.Geom.Rectangle;
  private beams!: Phaser.GameObjects.Graphics;
  private beamTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, cx: number, topY: number, w: number) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(14);
    const h = 30;   // visual plate height
    // Detection zone is TALLER + slightly WIDER than the visual plate so a
    // crate counts as delivered wherever it rests in the pad column (small
    // crates settle below the plate's bottom edge against the world floor).
    this.zone = new Phaser.Geom.Rectangle(cx - w / 2 - 12, topY - 14, w + 24, 120);

    const g = scene.add.graphics();
    // Glowing platform
    g.fillStyle(COLORS.lime, 0.14);
    g.fillRoundedRect(cx - w / 2, topY, w, h, 6);
    g.lineStyle(3, COLORS.lime, 1);
    g.strokeRoundedRect(cx - w / 2, topY, w, h, 6);
    // Chevrons pointing down (land here)
    g.lineStyle(2.5, COLORS.lime, 0.8);
    for (let i = 0; i < 3; i++) {
      const yy = topY + 8 + i * 6;
      g.lineBetween(cx - 10, yy, cx, yy + 6);
      g.lineBetween(cx + 10, yy, cx, yy + 6);
    }
    this.add(g);

    // Animated guide beams rising from the pad
    this.beams = scene.add.graphics();
    this.add(this.beams);
    this.beamTween = scene.tweens.addCounter({
      from: 0, to: 1, duration: 1200, repeat: -1,
      onUpdate: (tw) => {
        if (!this.beams.active) return;
        const t = tw.getValue() ?? 0;
        this.beams.clear();
        const a = 0.5 * (1 - t);
        this.beams.fillStyle(COLORS.lime, a);
        this.beams.fillRect(cx - w / 2 + 6, topY - t * 60, 4, 14);
        this.beams.fillRect(cx + w / 2 - 10, topY - t * 60, 4, 14);
      },
    });
  }

  contains(x: number, y: number): boolean {
    return this.zone.contains(x, y);
  }

  destroy(fromScene?: boolean): void {
    this.beamTween?.stop();
    super.destroy(fromScene);
  }
}

export default DeliveryPad;
