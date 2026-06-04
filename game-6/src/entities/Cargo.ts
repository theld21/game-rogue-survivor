import Phaser from 'phaser';
import { COLORS, CARGO_TYPES, CargoKind, TETHER, IMPACT } from '../config.ts';
import GameState from '../core/GameState.ts';

// =====================================================================
// Cargo.ts — A physical crate the drone hauls.
//
// Real Arcade DYNAMIC body (gravity-affected, collides with walls → that's
// how it takes damage). Once locked, a spring-damper drags it toward the
// drone's tail anchor each frame; gravity makes it hang and sway, the
// collider stops it at walls. HP only drops on impacts above the type's
// velocity threshold, with a per-body cooldown so resting contact is free.
// =====================================================================

export type CargoState = 'idle' | 'locked' | 'delivered' | 'broken';

export class Cargo extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  kind: CargoKind;
  hp: number;
  maxHp: number;
  bodyRadius: number;
  state: CargoState = 'idle';

  private gfx!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private lastHitAt = 0;
  private pulse?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: CargoKind) {
    super(scene, x, y);
    const def = CARGO_TYPES[kind];
    this.kind = kind;
    this.hp = def.maxHp;
    this.maxHp = def.maxHp;
    this.bodyRadius = def.radius;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(36);

    this.body.setCircle(this.bodyRadius, -this.bodyRadius, -this.bodyRadius);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.3);
    this.body.setDamping(true);
    this.body.setDrag(0.6, 0.6);
    // Cap fall speed near the drone's terminal so it never "drops out" faster
    // than the drone and over-stretches the tether → keeps laden/unladen even.
    this.body.setMaxVelocity(600, 560);
    // Waits at the pickup station (no gravity) until the magnet locks on.
    this.body.allowGravity = false;

    this.buildArt();
    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);
  }

  private buildArt(): void {
    const g = this.scene.add.graphics();
    const def = CARGO_TYPES[this.kind];
    const r = this.bodyRadius;

    // Glow
    g.fillStyle(def.glow, 0.16);
    g.fillCircle(0, 0, r * 1.5);

    if (this.kind === 'nuclear') {
      // Hazard core: round canister with radioactive trefoil
      g.fillStyle(0x16331a, 1);
      g.fillCircle(0, 0, r);
      g.lineStyle(2.5, COLORS.lime, 1);
      g.strokeCircle(0, 0, r);
      g.fillStyle(COLORS.lime, 0.9);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        g.slice(0, 0, r * 0.8, a - 0.5, a + 0.5, false);
        g.fillPath();
      }
      g.fillStyle(0x16331a, 1); g.fillCircle(0, 0, r * 0.28);
      g.fillStyle(COLORS.lime, 1); g.fillCircle(0, 0, r * 0.16);
      // Warning blink
      this.pulse = this.scene.tweens.add({ targets: g, alpha: 0.55, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    } else if (this.kind === 'alloy') {
      // Sleek hex pod
      const hex: number[] = [];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; hex.push(Math.cos(a) * r, Math.sin(a) * r); }
      g.fillStyle(0x281a52, 1);
      g.fillPoints(this.toPts(hex), true);
      g.lineStyle(2.5, COLORS.violet, 1);
      g.strokePoints(this.toPts(hex), true);
      g.lineStyle(1.5, COLORS.pink, 0.9);
      g.strokeCircle(0, 0, r * 0.5);
      g.fillStyle(COLORS.pink, 1); g.fillCircle(0, 0, r * 0.2);
    } else {
      // Iron crate: bolted square box
      g.fillStyle(0x2c3350, 1);
      g.fillRoundedRect(-r, -r, r * 2, r * 2, 4);
      g.lineStyle(2.5, COLORS.steel, 1);
      g.strokeRoundedRect(-r, -r, r * 2, r * 2, 4);
      // Cross brace
      g.lineStyle(2, COLORS.cyan, 0.7);
      g.lineBetween(-r, -r, r, r);
      g.lineBetween(r, -r, -r, r);
      // Corner bolts
      g.fillStyle(COLORS.cyan, 1);
      [[-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, r * 0.7]].forEach(([bx, by]) => g.fillCircle(bx, by, 2));
    }

    this.gfx = g;
    this.add(g);
  }

  private toPts(flat: number[]): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  lock(): void {
    if (this.state !== 'idle') return;
    this.state = 'locked';
    this.body.allowGravity = true;   // now it hangs & sways on the tether
  }

  /** Spring-damper drag toward the drone's tail anchor (call each frame). */
  tetherTo(ax: number, ay: number, delta: number): void {
    void delta;
    if (this.state !== 'locked') return;
    const dx = ax - this.x;
    const dy = ay - this.y;
    // Hooke pull toward anchor minus velocity damping; gravity (world) still
    // applies separately so the crate hangs below and sways.
    let fx = dx * TETHER.stiffness - this.body.velocity.x * TETHER.damping;
    let fy = dy * TETHER.stiffness - this.body.velocity.y * TETHER.damping;
    const mag = Math.hypot(fx, fy);
    if (mag > TETHER.maxAccel) { const k = TETHER.maxAccel / mag; fx *= k; fy *= k; }
    this.body.setAcceleration(fx, fy);
  }

  /** Returns true if this impact dealt damage (and how the cargo now stands). */
  takeImpact(impactSpeed: number): { hurt: boolean; broke: boolean } {
    if (this.state === 'delivered' || this.state === 'broken') return { hurt: false, broke: false };
    const def = CARGO_TYPES[this.kind];
    const now = this.scene.time.now;
    const effThreshold = def.impactThreshold; // shield handled on drone hull, cargo is raw
    if (impactSpeed < effThreshold) return { hurt: false, broke: false };
    if (now - this.lastHitAt < IMPACT.cooldownMs) return { hurt: false, broke: false };
    this.lastHitAt = now;

    const dmg = Math.round(def.hpPerHit * GameState.shieldMult());
    this.hp = Math.max(0, this.hp - dmg);
    this.flash();
    this.redrawHpBar();
    if (this.hp <= 0) { this.state = 'broken'; return { hurt: true, broke: true }; }
    return { hurt: true, broke: false };
  }

  private flash(): void {
    this.gfx.setAlpha(0.4);
    this.scene.time.delayedCall(70, () => this.gfx?.setAlpha(this.state === 'broken' ? 0 : 1));
  }

  private redrawHpBar(): void {
    const w = this.bodyRadius * 2.2, h = 4, y = -this.bodyRadius - 10;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const g = this.hpBar;
    g.clear();
    if (this.hp >= this.maxHp) return;
    g.fillStyle(0x000000, 0.5); g.fillRoundedRect(-w / 2 - 1, y - 1, w + 2, h + 2, 2);
    g.fillStyle(0x14213a, 1); g.fillRoundedRect(-w / 2, y, w, h, 2);
    const col = ratio > 0.5 ? COLORS.hullGood : ratio > 0.25 ? COLORS.hullWarn : COLORS.hullBad;
    g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, y, Math.max(1, w * ratio), h, 2);
  }

  setDelivered(): void { this.state = 'delivered'; this.body.setAcceleration(0, 0); }

  destroy(fromScene?: boolean): void {
    this.pulse?.stop();
    super.destroy(fromScene);
  }
}

export default Cargo;
