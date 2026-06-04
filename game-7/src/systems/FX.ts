import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// FX.ts — one-shot transient effects (self-destroy). Splatter on kill,
// dust on land, combo number, slash streak between dash nodes.
// =====================================================================

export class FX {
  constructor(private scene: Phaser.Scene) {}

  /** Neon-red splatter at a kill point. */
  splatter(x: number, y: number, color = COLORS.red): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 90, max: 320 }, scale: { start: 0.6, end: 0 },
      lifespan: { min: 180, max: 460 }, quantity: 16, blendMode: 'ADD',
      tint: [color, COLORS.white], emitting: false,
    }).setDepth(55);
    burst.explode(18);
    this.scene.time.delayedCall(550, () => burst.destroy());

    // Radial slash shards
    const ring = this.scene.add.graphics({ x, y }).setDepth(54);
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(0, 0, 12);
    this.scene.tweens.add({ targets: ring, scaleX: 3, scaleY: 3, alpha: 0, duration: 320, ease: 'Cubic.out', onComplete: () => ring.destroy() });
  }

  /** Combo counter pop: scales up then fades. */
  comboText(x: number, y: number, n: number): void {
    const t = this.scene.add.text(x, y, `+${n}`, {
      fontFamily: 'Orbitron, sans-serif', fontStyle: 'bold', fontSize: '26px',
      color: '#ff2b4e', stroke: '#04060a', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(60).setScale(0.4);
    this.scene.tweens.add({ targets: t, scale: 1.2, duration: 140, ease: 'Back.out' });
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 620, delay: 160, onComplete: () => t.destroy() });
  }

  /** Slash streak drawn between two dash nodes. */
  slash(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.scene.add.graphics().setDepth(53);
    g.lineStyle(6, COLORS.red, 0.25); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(3, COLORS.red, 0.85); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.4, COLORS.white, 1); g.lineBetween(x1, y1, x2, y2);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** Dust puff under the ninja's feet on a clean landing. */
  dust(x: number, y: number): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 130 }, angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0 }, lifespan: { min: 220, max: 420 }, quantity: 8,
      blendMode: 'ADD', tint: [COLORS.cyan, COLORS.white], emitting: false,
    }).setDepth(45);
    burst.explode(10);
    this.scene.time.delayedCall(450, () => burst.destroy());
  }

  /** EMP shockwave ring on platform landing (upgrade). */
  emp(x: number, y: number, radius: number): void {
    const ring = this.scene.add.graphics({ x, y }).setDepth(46);
    ring.lineStyle(4, COLORS.cyan, 0.9); ring.strokeCircle(0, 0, 20);
    this.scene.tweens.add({
      targets: ring, scaleX: radius / 20, scaleY: radius / 20, alpha: 0,
      duration: 420, ease: 'Cubic.out', onComplete: () => ring.destroy(),
    });
  }

  /** Ghost silhouette left behind during a dash (afterimage). */
  afterimage(x: number, y: number): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(38);
    g.fillStyle(COLORS.cyan, 0.5);
    g.fillRoundedRect(-9, -16, 18, 32, 4);
    g.fillStyle(COLORS.white, 0.4); g.fillCircle(0, -11, 8);
    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 0.7, scaleY: 0.7, duration: 280, ease: 'Cubic.out', onComplete: () => g.destroy() });
  }

  /** Small sparks (e.g. brushing a laser wall). */
  sparksAt(x: number, y: number): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 50, max: 160 }, scale: { start: 0.3, end: 0 }, lifespan: { min: 120, max: 280 },
      quantity: 5, blendMode: 'ADD', tint: [COLORS.red, COLORS.white], emitting: false,
    }).setDepth(50);
    burst.explode(5);
    this.scene.time.delayedCall(320, () => burst.destroy());
  }

  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, { fontFamily: 'Rajdhani, sans-serif', fontSize: '18px', color, stroke: '#04060a', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
}

export default FX;
