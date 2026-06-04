import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, SHIP } from '../config.ts';

// =====================================================================
// Spaceship.ts — The player's mining vessel.
//
// Fixed near the bottom of the screen (anchorYFrac). All gameplay motion
// comes from the world scrolling DOWN past it. The hull is pure-vector
// neon art; a Phaser particle emitter drives the flickering engine flame.
// GSAP handles the shake-on-hit so it stays smooth at 120 Hz ProMotion.
// =====================================================================

export class Spaceship extends Phaser.GameObjects.Container {
  hull = SHIP.maxHull;
  maxHull = SHIP.maxHull;
  alive = true;

  private hullGfx!: Phaser.GameObjects.Graphics;
  private engine!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glowPulse!: Phaser.GameObjects.Graphics;
  private shakeTween?: gsap.core.Tween;
  private baseX = 0;
  private baseY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.baseX = x;
    this.baseY = y;
    scene.add.existing(this);
    this.setDepth(40);

    this.buildEngineGlow();
    this.buildEngineParticles();
    this.buildHull();
  }

  // -- Soft glow halo under the engine ---------------------------------
  private buildEngineGlow(): void {
    this.glowPulse = this.scene.add.graphics();
    this.glowPulse.fillStyle(COLORS.cyan, 0.18);
    this.glowPulse.fillCircle(0, 34, 30);
    this.add(this.glowPulse);
    this.scene.tweens.add({
      targets: this.glowPulse,
      alpha: 0.5,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  // -- Phaser particle engine flame ------------------------------------
  private buildEngineParticles(): void {
    // Uses the baked 'spark' texture (radial glow) from the Preloader.
    this.engine = this.scene.add.particles(0, 30, 'spark', {
      speedY: { min: 140, max: 260 },
      speedX: { min: -28, max: 28 },
      scale: { start: 0.55, end: 0 },
      lifespan: { min: 220, max: 420 },
      quantity: 3,
      frequency: 18,
      blendMode: 'ADD',
      tint: [COLORS.cyan, COLORS.plasmaBlue, COLORS.white],
      alpha: { start: 0.9, end: 0 },
    });
    this.engine.setDepth(38);
    this.add(this.engine);
  }

  // -- Vector neon hull -------------------------------------------------
  private buildHull(): void {
    const g = this.scene.add.graphics();

    // Outer hull glow
    g.fillStyle(COLORS.cyan, 0.1);
    g.fillEllipse(0, 0, 76, 96);

    // Main fuselage (pointing UP, +x is right)
    const body: number[] = [
      0, -42,      // nose tip
      14, -14,
      20, 14,
      30, 30,      // right wing tip
      12, 24,
      0, 30,       // tail centre
      -12, 24,
      -30, 30,     // left wing tip
      -20, 14,
      -14, -14,
    ];
    g.fillStyle(0x101830, 0.98);
    g.fillPoints(this.toPts(body), true);
    g.lineStyle(2.5, COLORS.cyan, 1);
    g.strokePoints(this.toPts(body), true);

    // Cockpit canopy
    g.fillStyle(COLORS.plasmaBlue, 0.85);
    g.fillEllipse(0, -16, 16, 26);
    g.lineStyle(1.5, COLORS.ice, 0.9);
    g.strokeEllipse(0, -16, 16, 26);
    // Cockpit highlight
    g.fillStyle(COLORS.white, 0.7);
    g.fillEllipse(-3, -22, 4, 8);

    // Wing accent stripes
    g.lineStyle(2, COLORS.pink, 0.9);
    g.beginPath(); g.moveTo(-16, 8); g.lineTo(-26, 26); g.strokePath();
    g.beginPath(); g.moveTo(16, 8); g.lineTo(26, 26); g.strokePath();

    // Hull rivet lights
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(-10, 2, 2);
    g.fillCircle(10, 2, 2);

    // Engine nozzles
    g.fillStyle(0x1a2440, 1);
    g.fillRect(-10, 28, 7, 8);
    g.fillRect(3, 28, 7, 8);
    g.lineStyle(1.5, COLORS.cyan, 0.8);
    g.strokeRect(-10, 28, 7, 8);
    g.strokeRect(3, 28, 7, 8);

    this.hullGfx = g;
    this.add(g);
  }

  private toPts(flat: number[]): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  // -- Combat -----------------------------------------------------------
  /** World-space muzzle point where the gun pivot sits (just above the nose). */
  get muzzle(): { x: number; y: number } {
    return { x: this.baseX, y: this.baseY - 36 };
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hull = Math.max(0, this.hull - amount);
    this.shake();
    this.flashHull();
    if (this.hull <= 0) {
      this.alive = false;
    }
  }

  heal(amount: number): void {
    this.hull = Math.min(this.maxHull, this.hull + amount);
  }

  /** GSAP shake — smooth at any refresh rate (frame-independent). */
  private shake(): void {
    this.shakeTween?.kill();
    const intensity = 8;
    this.shakeTween = gsap.to(this, {
      duration: 0.05,
      repeat: 7,
      yoyo: true,
      ease: 'none',
      onUpdate: () => {
        this.x = this.baseX + (Math.random() - 0.5) * intensity * 2;
        this.y = this.baseY + (Math.random() - 0.5) * intensity * 2;
      },
      onComplete: () => { this.x = this.baseX; this.y = this.baseY; },
    });
  }

  private flashHull(): void {
    this.hullGfx.setAlpha(0.4);
    this.scene.time.delayedCall(SHIP.hitFlashMs, () => this.hullGfx.setAlpha(1));
  }

  /** Brief engine boost flare (e.g. on level start). */
  boostFlare(): void {
    this.engine.frequency = 6;
    this.scene.time.delayedCall(600, () => { this.engine.frequency = 18; });
  }

  destroy(fromScene?: boolean): void {
    this.shakeTween?.kill();
    super.destroy(fromScene);
  }
}

export default Spaceship;
