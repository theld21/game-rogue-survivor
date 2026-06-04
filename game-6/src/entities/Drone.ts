import Phaser from 'phaser';
import { COLORS, DRONE, TETHER } from '../config.ts';
import GameState from '../core/GameState.ts';

// =====================================================================
// Drone.ts — The player's gravity-bound transport drone.
//
// Real Arcade dynamic body (gravity pulls it down). Dual-thrust: holding
// the LEFT side fires the left engine pushing UP-RIGHT; the RIGHT side
// pushes UP-LEFT; both → straight up. Thrust is applied as ACCELERATION
// while held (delta handled by the physics engine = framerate-independent).
// Bank tilt is VISUAL ONLY (hull graphic), proportional to horizontal vel.
// =====================================================================

export class Drone extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  leftOn = false;
  rightOn = false;
  ladenMult = 1;            // thrust scale while carrying (heavier cargo → lower)
  alive = true;

  bodyRadius = DRONE.bodyRadius;

  private hull!: Phaser.GameObjects.Container;
  private hullGfx!: Phaser.GameObjects.Graphics;
  private leftEngine!: Phaser.GameObjects.Particles.ParticleEmitter;
  private rightEngine!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bank = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(40);

    this.body.setCircle(this.bodyRadius, -this.bodyRadius, -this.bodyRadius);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.25);
    this.body.setDrag(DRONE.drag, DRONE.drag);
    this.body.setMaxVelocity(DRONE.maxSpeed, DRONE.maxSpeed * 1.4);

    this.buildEngines();
    this.buildHull();
  }

  private buildEngines(): void {
    const cfg = (tint: number[]): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig => ({
      speedY: { min: 90, max: 190 },
      speedX: { min: -30, max: 30 },
      scale: { start: 0.5, end: 0 },
      lifespan: { min: 180, max: 360 },
      frequency: 22,
      quantity: 2,
      blendMode: 'ADD',
      tint,
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
    this.leftEngine = this.scene.add.particles(0, 0, 'spark', cfg([COLORS.cyan, COLORS.lime, COLORS.white])).setDepth(38);
    this.rightEngine = this.scene.add.particles(0, 0, 'spark', cfg([COLORS.orange, COLORS.yellow, COLORS.white])).setDepth(38);
  }

  private buildHull(): void {
    this.hull = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    const r = this.bodyRadius;

    // Glow
    g.fillStyle(COLORS.cyan, 0.12);
    g.fillCircle(0, 0, r * 1.8);

    // Body pod (rounded hull)
    g.fillStyle(0x20184a, 1);
    g.fillRoundedRect(-r, -r * 0.7, r * 2, r * 1.4, 8);
    g.lineStyle(2.5, COLORS.cyan, 1);
    g.strokeRoundedRect(-r, -r * 0.7, r * 2, r * 1.4, 8);

    // Cockpit dome
    g.fillStyle(COLORS.pink, 0.85);
    g.fillCircle(0, -r * 0.2, r * 0.5);
    g.lineStyle(1.5, COLORS.white, 0.8);
    g.strokeCircle(0, -r * 0.2, r * 0.5);
    g.fillStyle(COLORS.white, 0.7);
    g.fillCircle(-r * 0.18, -r * 0.35, r * 0.16);

    // Side engine pods
    g.fillStyle(0x2a1f5c, 1);
    g.fillRoundedRect(-r * 1.5, r * 0.1, r * 0.6, r * 0.8, 3);
    g.fillRoundedRect(r * 0.9, r * 0.1, r * 0.6, r * 0.8, 3);
    g.lineStyle(2, COLORS.lime, 0.9);
    g.strokeRoundedRect(-r * 1.5, r * 0.1, r * 0.6, r * 0.8, 3);
    g.lineStyle(2, COLORS.orange, 0.9);
    g.strokeRoundedRect(r * 0.9, r * 0.1, r * 0.6, r * 0.8, 3);

    // Nav lights
    g.fillStyle(COLORS.lime, 1); g.fillCircle(-r * 1.2, r * 0.1, 2);
    g.fillStyle(COLORS.orange, 1); g.fillCircle(r * 1.2, r * 0.1, 2);

    this.hullGfx = g;
    this.hull.add(g);
    this.add(this.hull);
  }

  /** Set engine state for this frame (scene decides based on input + fuel). */
  setEngines(left: boolean, right: boolean): void {
    this.leftOn = left;
    this.rightOn = right;
  }

  get anyEngineOn(): boolean { return this.leftOn || this.rightOn; }

  /** Heavier cargo → lower thrust multiplier (sluggish). weightMult ~0.7..1.6. */
  setLaden(weightMult: number): void {
    this.ladenMult = Phaser.Math.Clamp(1 - 0.28 * weightMult, 0.5, 0.95);
  }

  /** World anchor at the drone's tail where the magnet tether attaches. */
  getAnchor(): { x: number; y: number } {
    return { x: this.x, y: this.y + this.bodyRadius + TETHER.anchorBelow };
  }

  update(delta: number): void {
    if (!this.alive) return;
    const mult = this.ladenMult * GameState.engineMult();

    let ax = 0, ay = 0;
    if (this.leftOn) { ax += DRONE.thrustX; ay -= DRONE.thrustY; }
    if (this.rightOn) { ax -= DRONE.thrustX; ay -= DRONE.thrustY; }
    this.body.setAcceleration(ax * mult, ay * mult);

    // Engine particle nozzles (world positions, below each pod)
    const r = this.bodyRadius;
    this.leftEngine.setPosition(this.x - r * 1.2, this.y + r * 0.8);
    this.rightEngine.setPosition(this.x + r * 1.2, this.y + r * 0.8);
    this.leftEngine.emitting = this.leftOn;
    this.rightEngine.emitting = this.rightOn;

    // Bank tilt (visual): lean into horizontal velocity, lerped, clamped
    const targetBank = Phaser.Math.Clamp(this.body.velocity.x / DRONE.maxSpeed, -1, 1) * Phaser.Math.DegToRad(DRONE.maxBankDeg);
    this.bank = Phaser.Math.Linear(this.bank, targetBank, DRONE.bankLerp * (delta / 16.67));
    this.hull.rotation = this.bank;
  }

  hitFlash(): void {
    this.hullGfx.setAlpha(0.4);
    this.scene.time.delayedCall(90, () => this.hullGfx?.setAlpha(1));
  }

  destroy(fromScene?: boolean): void {
    this.leftEngine?.destroy();
    this.rightEngine?.destroy();
    super.destroy(fromScene);
  }
}

export default Drone;
