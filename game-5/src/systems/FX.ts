import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// FX.ts — One-shot transient visual effects (never per-frame redraws).
// Each effect self-destroys via its own tween/emitter completion.
// =====================================================================

export class FX {
  constructor(private scene: Phaser.Scene) {}

  /** Asteroid shatter: fragment shards fly out + flash ring. */
  shatter(x: number, y: number, color: number, count = 9): void {
    // Flash ring
    const ring = this.scene.add.graphics({ x, y }).setDepth(30);
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(0, 0, 14);
    this.scene.tweens.add({
      targets: ring, scaleX: 3.4, scaleY: 3.4, alpha: 0,
      duration: 420, ease: 'Cubic.out', onComplete: () => ring.destroy(),
    });

    // Rock fragments — small jagged triangles
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 40 + Math.random() * 70;
      const frag = this.scene.add.graphics({ x, y }).setDepth(31);
      const s = 4 + Math.random() * 6;
      frag.fillStyle(color, 1);
      frag.fillTriangle(-s, s, s, s * 0.6, 0, -s);
      frag.setRotation(Math.random() * Math.PI * 2);
      this.scene.tweens.add({
        targets: frag,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        rotation: frag.rotation + (Math.random() - 0.5) * 6,
        alpha: 0,
        scaleX: 0.3, scaleY: 0.3,
        duration: 460 + Math.random() * 240,
        ease: 'Quad.out',
        onComplete: () => frag.destroy(),
      });
    }

    // Spark burst via particles
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 80, max: 260 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 200, max: 500 },
      quantity: count,
      blendMode: 'ADD',
      tint: [color, COLORS.white],
      emitting: false,
    }).setDepth(32);
    burst.explode(count + 4);
    this.scene.time.delayedCall(600, () => burst.destroy());
  }

  /** Small impact spark when a laser hits but doesn't crack. */
  impact(x: number, y: number, color = COLORS.cyan): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(33);
    g.fillStyle(color, 0.9);
    g.fillCircle(0, 0, 6);
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(0, 0, 3);
    this.scene.tweens.add({
      targets: g, scaleX: 2, scaleY: 2, alpha: 0,
      duration: 160, onComplete: () => g.destroy(),
    });
  }

  /** Floating value text (e.g. +45 credits). */
  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '18px',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({
      targets: t, y: y - 48, alpha: 0,
      duration: 850, ease: 'Cubic.out', onComplete: () => t.destroy(),
    });
  }

  /** Pickup sparkle when item reaches the ship. */
  collectBurst(x: number, y: number, color: number): void {
    const burst = this.scene.add.particles(x, y, 'spark', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 180, max: 380 },
      quantity: 8,
      blendMode: 'ADD',
      tint: [color, COLORS.white],
      emitting: false,
    }).setDepth(34);
    burst.explode(10);
    this.scene.time.delayedCall(450, () => burst.destroy());
  }
}

export default FX;
