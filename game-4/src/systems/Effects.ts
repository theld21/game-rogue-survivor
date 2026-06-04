import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig.ts';

// =====================================================================
// Effects.ts — Transient visual flourishes.
//
// Short-lived Graphics/Text created on demand and auto-destroyed by their
// own tween/timer. These are one-shot events (a hit, a sinking), NOT
// per-frame redraws, so allocating here is fine.
// =====================================================================

export class Effects {
  constructor(private scene: Phaser.Scene) {}

  muzzleFlash(x: number, y: number, color: number): void {
    const g = this.scene.add.graphics({ x, y }).setDepth(45);
    g.fillStyle(color, 0.9);
    g.fillCircle(0, 0, 7);
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(0, 0, 3);
    this.scene.tweens.add({
      targets: g,
      scale: 2.2,
      alpha: 0,
      duration: 180,
      onComplete: () => g.destroy(),
    });
  }

  splash(x: number, y: number, color = COLORS.foam): void {
    const ring = this.scene.add.graphics({ x, y }).setDepth(6);
    ring.lineStyle(2, color, 0.8);
    ring.strokeCircle(0, 0, 6);
    this.scene.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });
  }

  explosion(x: number, y: number, big = false): void {
    const scale = big ? 2.4 : 1;
    // Flash core
    const core = this.scene.add.graphics({ x, y }).setDepth(46);
    core.fillStyle(COLORS.ember, 1);
    core.fillCircle(0, 0, 14 * scale);
    core.fillStyle(COLORS.gold, 1);
    core.fillCircle(0, 0, 7 * scale);
    this.scene.tweens.add({
      targets: core,
      scale: 2.4,
      alpha: 0,
      duration: 420,
      onComplete: () => core.destroy(),
    });
    // Shockwave ring
    const ring = this.scene.add.graphics({ x, y }).setDepth(46);
    ring.lineStyle(3, COLORS.ember, 0.9);
    ring.strokeCircle(0, 0, 12 * scale);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.6,
      alpha: 0,
      duration: 520,
      onComplete: () => ring.destroy(),
    });
    // Debris sparks
    const sparks = big ? 14 : 8;
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + Math.random();
      const d = (30 + Math.random() * 40) * scale;
      const s = this.scene.add.graphics({ x, y }).setDepth(46);
      s.fillStyle(i % 2 ? COLORS.gold : COLORS.ember, 1);
      s.fillCircle(0, 0, 2.5 * scale);
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        duration: 420 + Math.random() * 220,
        onComplete: () => s.destroy(),
      });
    }
  }

  floatText(x: number, y: number, text: string, color: string): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '18px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.scene.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }
}

export default Effects;
