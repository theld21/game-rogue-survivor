import Phaser from 'phaser';
import { COLORS, NINJA, WORLD } from '../config.ts';

// =====================================================================
// Ninja.ts — The player. FULLY KINEMATIC (no Arcade body). The scene
// drives dashing by lerping x/y; gravity free-fall is integrated here
// with the shared slow-mo dt so it honours time-scale automatically.
// =====================================================================

export type NinjaState = 'idle' | 'aiming' | 'dashing' | 'falling' | 'stunned';

export class Ninja extends Phaser.GameObjects.Container {
  hp = NINJA.maxHp;
  maxHp = NINJA.maxHp;
  stamina = NINJA.maxStamina;
  maxStamina = NINJA.maxStamina;
  state: NinjaState = 'idle';
  vy = 0;                 // vertical velocity for free-fall
  radius = NINJA.radius;
  alive = true;

  private bodyGfx!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(40);
    this.buildTrail();
    this.buildArt();
  }

  private buildTrail(): void {
    this.trail = this.scene.add.particles(0, 0, 'spark', {
      speed: 0, scale: { start: 0.5, end: 0 }, lifespan: 220,
      frequency: 18, blendMode: 'ADD', tint: [COLORS.cyan, COLORS.white], alpha: { start: 0.7, end: 0 },
      emitting: false,
    }).setDepth(39);
  }

  private buildArt(): void {
    this.glow = this.scene.add.graphics();
    this.glow.fillStyle(COLORS.cyan, 0.18);
    this.glow.fillCircle(0, 0, this.radius * 1.9);
    this.add(this.glow);

    const g = this.scene.add.graphics();
    const r = this.radius;
    // Sleek angular body
    g.fillStyle(0x0a1424, 1);
    g.fillRoundedRect(-r * 0.55, -r, r * 1.1, r * 2, 4);
    g.lineStyle(2.2, COLORS.cyan, 1);
    g.strokeRoundedRect(-r * 0.55, -r, r * 1.1, r * 2, 4);
    // Head + visor
    g.fillStyle(0x0a1424, 1); g.fillCircle(0, -r * 0.7, r * 0.5);
    g.lineStyle(2, COLORS.cyan, 1); g.strokeCircle(0, -r * 0.7, r * 0.5);
    g.fillStyle(COLORS.red, 1); g.fillRect(-r * 0.35, -r * 0.8, r * 0.7, r * 0.18);
    // Energy blade on the back
    g.lineStyle(3, COLORS.red, 0.9);
    g.lineBetween(r * 0.4, -r * 1.1, r * 1.1, r * 0.6);
    g.lineStyle(1.4, COLORS.white, 0.9);
    g.lineBetween(r * 0.4, -r * 1.1, r * 1.1, r * 0.6);
    // Core light
    g.fillStyle(COLORS.cyan, 1); g.fillCircle(0, 0, 2.6);
    this.bodyGfx = g;
    this.add(g);
  }

  setMode(s: NinjaState): void {
    this.state = s;
    this.trail.emitting = (s === 'dashing');
    this.glow.setVisible(s !== 'stunned');
  }

  /** Update trail anchor + free-fall integration (dt already slow-mo scaled). */
  update(dt: number): void {
    this.trail.setPosition(this.x, this.y);

    if (this.state === 'falling') {
      this.vy += WORLD.gravity * dt;
      this.y += this.vy * dt;
    }
    if (this.flashUntil && this.scene.time.now > this.flashUntil) { this.bodyGfx.setAlpha(1); this.flashUntil = 0; }
    // Stunned wobble
    if (this.state === 'stunned') this.bodyGfx.setRotation(Math.sin(this.scene.time.now * 0.03) * 0.18);
    else this.bodyGfx.setRotation(0);
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.bodyGfx.setAlpha(0.35);
    this.flashUntil = this.scene.time.now + 90;
    if (this.hp <= 0) this.alive = false;
  }

  /** Squash-and-stretch on landing. */
  squash(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1.35, 0.6);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 240, ease: 'Back.out' });
  }

  refillStamina(): void { this.stamina = this.maxStamina; }
  spendStamina(): boolean { if (this.stamina <= 0) return false; this.stamina--; return true; }

  destroy(fromScene?: boolean): void {
    this.trail?.destroy();
    super.destroy(fromScene);
  }
}

export default Ninja;
