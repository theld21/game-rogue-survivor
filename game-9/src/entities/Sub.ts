import Phaser from 'phaser';
import { COLORS, SUB, LIGHT, RESOURCE_KINDS } from '../config.ts';
import GameState from '../core/GameState.ts';

// =====================================================================
// Sub.ts — the explorer submarine. Arcade body with heavy water drag +
// gentle buoyancy (you must thrust DOWN to dive). Carries the survival
// stats, cargo and a steerable flashlight. Field `hullGfx` (not `body`).
// =====================================================================

export class Sub extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  hull: number; maxHull: number;
  oxygen: number; maxOxygen: number;
  battery: number; maxBattery: number;
  cargoMax = SUB.cargoMax;
  cargo: Record<string, number> = {};
  heading = Math.PI / 2;      // points down at start
  radius = SUB.radius;
  alive = true;
  lightOn = true;
  lightRange: number;
  invulnUntil = 0;

  private hullGfx!: Phaser.GameObjects.Graphics;
  private propGfx!: Phaser.GameObjects.Graphics;
  private flashUntil = 0;
  private thrusting = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const ox = GameState.getUpgrade('oxygen'), bat = GameState.getUpgrade('battery'), hl = GameState.getUpgrade('hull'), lt = GameState.getUpgrade('light');
    this.maxHull = SUB.maxHull + hl * 30; this.hull = this.maxHull;
    this.maxOxygen = SUB.maxOxygen + ox * 45; this.oxygen = this.maxOxygen;
    this.maxBattery = SUB.maxBattery + bat * 45; this.battery = this.maxBattery;
    this.lightRange = LIGHT.range + lt * 110;
    RESOURCE_KINDS.forEach((k) => (this.cargo[k] = 0));

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(this.radius, -this.radius, -this.radius);
    this.body.setDrag(SUB.drag, SUB.drag);
    this.body.setMaxVelocity(SUB.maxSpeed, SUB.maxSpeed);
    this.setDepth(50);
    this.buildArt();
  }

  private buildArt(): void {
    this.propGfx = this.scene.add.graphics(); this.add(this.propGfx);
    const g = this.scene.add.graphics(); const r = this.radius;
    const trim = COLORS.cockpit, steel = COLORS.hull, steelDk = COLORS.hullDark;
    g.fillStyle(trim, 0.08); g.fillCircle(0, 0, r * 1.7);
    // tail thruster ring (propeller housing)
    g.fillStyle(0x223349, 1); g.fillCircle(-r * 1.2, 0, r * 0.46);
    g.lineStyle(3, trim, 0.7); g.strokeCircle(-r * 1.2, 0, r * 0.46);
    g.fillStyle(0x0c1620, 1); g.fillCircle(-r * 1.2, 0, r * 0.24);
    // small swept tail stabilisers (not a fish fin)
    g.fillStyle(steelDk, 1); g.fillTriangle(-r * 0.75, -r * 0.55, -r * 1.25, -r * 0.95, -r * 0.45, -r * 0.7);
    g.fillTriangle(-r * 0.75, r * 0.55, -r * 1.25, r * 0.95, -r * 0.45, r * 0.7);
    // sensor mast on top (small antenna, amber tip)
    g.lineStyle(2.5, steelDk, 1); g.lineBetween(-r * 0.15, -r * 0.85, -r * 0.15, -r * 1.35);
    g.fillStyle(COLORS.warn, 1); g.fillCircle(-r * 0.15, -r * 1.35, 2.6);
    // rounded steel hull, two-tone
    g.fillStyle(steelDk, 1); g.fillEllipse(0, r * 0.12, r * 2.0, r * 1.8);
    g.fillStyle(steel, 1); g.fillEllipse(0, -r * 0.06, r * 1.95, r * 1.66);
    g.fillStyle(0xeef5ff, 1); g.fillEllipse(-r * 0.15, -r * 0.62, r * 1.25, r * 0.5);   // top sheen
    g.lineStyle(2.5, 0x223349, 1); g.strokeEllipse(0, 0, r * 2.0, r * 1.74);
    // cyan trim band around the hull
    g.fillStyle(trim, 0.85); g.fillRoundedRect(-r * 0.55, -r * 0.05, r * 0.9, r * 0.14, r * 0.07);
    // BIG glass cockpit dome at the nose (the signature look)
    g.fillStyle(0x0a1620, 1); g.fillCircle(r * 0.62, 0, r * 0.82);
    g.fillStyle(trim, 0.95); g.fillCircle(r * 0.62, 0, r * 0.7);
    g.fillStyle(0x16384a, 0.5); g.fillCircle(r * 0.8, r * 0.22, r * 0.42);              // inner depth shade
    g.fillStyle(COLORS.white, 0.85); g.fillEllipse(r * 0.42, -r * 0.34, r * 0.36, r * 0.2);  // glass highlight
    g.lineStyle(3, 0x223349, 1); g.strokeCircle(r * 0.62, 0, r * 0.76);
    // twin headlights low on the hull beside the dome
    g.fillStyle(0x2a3a52, 1); g.fillCircle(r * 0.95, r * 0.78, r * 0.2); g.fillCircle(r * 0.3, r * 0.86, r * 0.18);
    g.fillStyle(COLORS.light, 1); g.fillCircle(r * 0.95, r * 0.78, r * 0.11); g.fillCircle(r * 0.3, r * 0.86, r * 0.1);
    g.fillStyle(COLORS.white, 0.9); g.fillCircle(r * 0.95, r * 0.78, 2); g.fillCircle(r * 0.3, r * 0.86, 2);
    this.hullGfx = g; this.add(g);
  }

  /** dt seconds; thrust dir + magnitude. Returns true if actively thrusting. */
  drive(dt: number, tx: number, ty: number, mag: number): boolean {
    if (!this.alive) return false;
    this.thrusting = mag > 0.12 && this.battery > 0;
    let ax = 0, ay = SUB.buoyancy;     // always-on gentle float
    if (this.thrusting) {
      ax = tx * SUB.accel; ay += ty * SUB.accel;
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(ty, tx), SUB.angularLerp * (dt * 60));
    } else {
      // coasting: only gently drift heading toward motion (much weaker inertia turn)
      const sp = this.body.velocity.length();
      if (sp > 70) this.heading = Phaser.Math.Angle.RotateTo(this.heading, this.body.velocity.angle(), 0.012 * (dt * 60));
    }
    this.body.setAcceleration(ax, ay);
    this.rotation = this.heading;

    // gentle propeller swirl at the housing (NO flame — it's a submarine; bubbles do the rest)
    this.propGfx.clear();
    if (this.thrusting) {
      const r = this.radius; const a = this.scene.time.now * 0.02;
      this.propGfx.lineStyle(2, COLORS.cockpit, 0.4);
      this.propGfx.strokeCircle(-r * 1.25, 0, r * 0.32 + Math.sin(a) * 2);
    }
    if (this.flashUntil && this.scene.time.now > this.flashUntil) { this.hullGfx.setAlpha(1); this.flashUntil = 0; }
    return this.thrusting;
  }

  muzzle(): { x: number; y: number; angle: number } {
    return { x: this.x + Math.cos(this.heading) * this.radius * 1.2, y: this.y + Math.sin(this.heading) * this.radius * 1.2, angle: this.heading };
  }

  cargoCount(): number { return RESOURCE_KINDS.reduce((s, k) => s + (this.cargo[k] ?? 0), 0); }
  cargoFull(): boolean { return this.cargoCount() >= this.cargoMax; }
  addCargo(kind: string): boolean { if (this.cargoFull()) return false; this.cargo[kind] = (this.cargo[kind] ?? 0) + 1; return true; }
  clearCargo(): void { RESOURCE_KINDS.forEach((k) => (this.cargo[k] = 0)); }

  takeDamage(n: number, ignoreInvuln = false): void {
    if (!this.alive || (!ignoreInvuln && this.scene.time.now < this.invulnUntil)) return;
    this.hull = Math.max(0, this.hull - n);
    this.hullGfx.setAlpha(0.4); this.flashUntil = this.scene.time.now + 90;
    if (!ignoreInvuln) this.invulnUntil = this.scene.time.now + 260;
    if (this.hull <= 0) this.alive = false;
  }
  refill(): void { this.hull = this.maxHull; this.oxygen = this.maxOxygen; this.battery = this.maxBattery; }

  destroy(fromScene?: boolean): void { super.destroy(fromScene); }
}
export default Sub;
