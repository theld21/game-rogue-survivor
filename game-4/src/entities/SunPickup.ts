import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig.ts';

// =====================================================================
// SunPickup.ts — Rare ☀️ collectible that spawns on open water.
//
// Collect by sailing within COLLECT_RANGE. After collection the scene
// immediately respawns it at a new random location.
// =====================================================================

const COLLECT_RANGE = 48;
const RAY_COUNT = 8;

export class SunPickup extends Phaser.GameObjects.Container {
  collected = false;
  private art!: Phaser.GameObjects.Graphics;
  private glowRing!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(20);
    this.buildArt();

    // Bob tween
    scene.tweens.add({
      targets: this,
      y: y - 14,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // Slow rotation of the outer ring
    scene.tweens.add({
      targets: this.glowRing,
      rotation: Math.PI * 2,
      duration: 5000,
      repeat: -1,
    });
  }

  private buildArt(): void {
    // Outer glow ring (rotates)
    this.glowRing = this.scene.add.graphics();
    this.drawRays(this.glowRing, 20, 32, 0xfbbf24, 0.35);
    this.add(this.glowRing);

    this.art = this.scene.add.graphics();
    // Inner rays
    this.drawRays(this.art, 14, 22, 0xffd970, 0.8);
    // Sun body
    this.art.fillStyle(0xffe566, 1);
    this.art.fillCircle(0, 0, 13);
    this.art.fillStyle(0xfbbf24, 1);
    this.art.fillCircle(0, 0, 9);
    // Core highlight
    this.art.fillStyle(0xfff4b0, 0.9);
    this.art.fillCircle(-3, -3, 4);
    // Thin neon rim
    this.art.lineStyle(1.5, COLORS.gold, 1);
    this.art.strokeCircle(0, 0, 13);
    this.add(this.art);

    // Subtle halo behind everything
    const halo = this.scene.add.graphics();
    halo.fillStyle(0xfbbf24, 0.08);
    halo.fillCircle(0, 0, 38);
    this.addAt(halo, 0);

    // Pulse the whole container scale gently
    this.scene.tweens.add({
      targets: this.art,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private drawRays(g: Phaser.GameObjects.Graphics, r1: number, r2: number, color: number, alpha: number): void {
    g.lineStyle(2.5, color, alpha);
    for (let i = 0; i < RAY_COUNT; i++) {
      const a = (i / RAY_COUNT) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2);
    }
  }

  /** Returns true if the player is in collect range. */
  checkCollect(playerX: number, playerY: number): boolean {
    if (this.collected) return false;
    return Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) < COLLECT_RANGE;
  }

  /** Play a burst animation then destroy. */
  collectEffect(): void {
    this.collected = true;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.art);
    this.scene.tweens.killTweensOf(this.glowRing);
    this.scene.tweens.add({
      targets: this,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 340,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}

export default SunPickup;
