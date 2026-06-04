import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// FX.ts — One-shot transient effects (self-destroy via tween/emitter).
// =====================================================================

export class FX {
  constructor(private scene: Phaser.Scene) {}

  /** Impact sparks at a collision point. */
  sparks(x: number, y: number, color = COLORS.yellow, n = 8): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 220 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 160, max: 380 },
      quantity: n,
      blendMode: 'ADD',
      tint: [color, COLORS.white],
      emitting: false,
    }).setDepth(50);
    burst.explode(n);
    this.scene.time.delayedCall(450, () => burst.destroy());
  }

  /** Big crate-shatter explosion + flying shards. */
  shatter(x: number, y: number, color: number): void {
    const ring = this.scene.add.graphics({ x, y }).setDepth(51);
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(0, 0, 16);
    this.scene.tweens.add({ targets: ring, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 460, ease: 'Cubic.out', onComplete: () => ring.destroy() });

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random();
      const dist = 40 + Math.random() * 80;
      const s = 4 + Math.random() * 6;
      const frag = this.scene.add.graphics({ x, y }).setDepth(52);
      frag.fillStyle(color, 1);
      frag.fillRect(-s / 2, -s / 2, s, s);
      frag.setRotation(Math.random() * Math.PI);
      this.scene.tweens.add({
        targets: frag,
        x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
        rotation: frag.rotation + (Math.random() - 0.5) * 6, alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 480 + Math.random() * 240, ease: 'Quad.out', onComplete: () => frag.destroy(),
      });
    }
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 80, max: 280 }, scale: { start: 0.5, end: 0 },
      lifespan: { min: 200, max: 500 }, quantity: 16, blendMode: 'ADD',
      tint: [color, COLORS.white, COLORS.orange], emitting: false,
    }).setDepth(52);
    burst.explode(18);
    this.scene.time.delayedCall(600, () => burst.destroy());
  }

  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 850, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  /** Sparkle when cargo locks / delivers. */
  pop(x: number, y: number, color: number): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 50, max: 160 }, scale: { start: 0.4, end: 0 },
      lifespan: { min: 200, max: 400 }, quantity: 10, blendMode: 'ADD',
      tint: [color, COLORS.white], emitting: false,
    }).setDepth(53);
    burst.explode(12);
    this.scene.time.delayedCall(450, () => burst.destroy());
  }
}

export default FX;
