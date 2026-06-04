import Phaser from 'phaser';
import { COLORS, SHIP, BOOST, ELEMENT_KINDS, POWERUPS, POWER, PowerKind } from '../config.ts';
import GameState from '../core/GameState.ts';

// =====================================================================
// PlayerShip.ts — the Aether airship. Arcade dynamic body gives real
// inertia (acceleration + drag + max-velocity). Heading smoothly lerps
// toward the thrust direction. Headlight cone lights up at night.
// Field is hullGfx (NOT `body`, which Container reserves for physics).
// =====================================================================

export class PlayerShip extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  hp: number; maxHp: number;
  fuel = SHIP.maxFuel; maxFuel = SHIP.maxFuel;
  cargoMax: number;
  cargo: Record<string, number> = {};
  accel: number; topSpeed: number; bulletDmg: number;
  heading = 0;            // radians the hull points
  radius = SHIP.radius;
  alive = true;
  boosting = false;
  invulnUntil = 0;
  shieldUntil = 0; speedUntil = 0; redUntil = 0; healUntil = 0;

  private hullGfx!: Phaser.GameObjects.Graphics;
  private headlight!: Phaser.GameObjects.Graphics;
  private engineGlow!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private thrusting = false;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const eng = GameState.getUpgrade('engine'), hull = GameState.getUpgrade('hull'),
      cargo = GameState.getUpgrade('cargo'), weap = GameState.getUpgrade('weapon');
    this.maxHp = SHIP.maxHp + hull * 35; this.hp = this.maxHp;
    this.cargoMax = SHIP.cargoMax + cargo * 20;
    this.accel = SHIP.accel * (1 + eng * 0.18);
    this.topSpeed = SHIP.maxSpeed * (1 + eng * 0.16);
    this.bulletDmg = SHIP.bulletDmg + weap * 9;
    ELEMENT_KINDS.forEach((k) => (this.cargo[k] = 0));

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(this.radius, -this.radius, -this.radius);
    this.body.setDrag(SHIP.drag, SHIP.drag);
    this.body.setMaxVelocity(this.topSpeed, this.topSpeed);
    this.setDepth(50);

    this.buildTrail();
    this.buildArt();
  }

  private buildTrail(): void {
    this.trail = this.scene.add.particles(0, 0, 'spark', {
      speed: 0, scale: { start: 0.5, end: 0 }, lifespan: 360, frequency: 22,
      blendMode: 'ADD', tint: [COLORS.gold, COLORS.amber, COLORS.ember], alpha: { start: 0.7, end: 0 }, emitting: false,
    }).setDepth(48);
  }

  private buildArt(): void {
    // Headlight cone (behind hull, shown at night)
    this.headlight = this.scene.add.graphics();
    this.headlight.fillStyle(COLORS.gold, 0.13);
    this.headlight.beginPath(); this.headlight.moveTo(0, 0);
    this.headlight.arc(0, 0, 240, -0.4, 0.4); this.headlight.closePath(); this.headlight.fillPath();
    this.headlight.setVisible(false);
    this.add(this.headlight);

    this.engineGlow = this.scene.add.graphics();
    this.add(this.engineGlow);

    const g = this.scene.add.graphics();
    const r = this.radius;
    // Aether sails (wings)
    g.fillStyle(COLORS.aether, 0.5);
    g.fillTriangle(-r * 0.2, -r * 1.5, -r * 1.0, -r * 0.5, r * 0.1, -r * 0.4);
    g.fillTriangle(-r * 0.2, r * 1.5, -r * 1.0, r * 0.5, r * 0.1, r * 0.4);
    g.lineStyle(1.5, COLORS.aetherHot, 0.8);
    g.lineBetween(-r * 0.2, -r * 1.5, r * 0.1, -r * 0.4);
    g.lineBetween(-r * 0.2, r * 1.5, r * 0.1, r * 0.4);
    // Hull (elongated, nose toward +x)
    g.fillStyle(COLORS.hullDark, 1);
    g.fillPoints([
      new Phaser.Geom.Point(r * 1.5, 0), new Phaser.Geom.Point(r * 0.3, -r * 0.7),
      new Phaser.Geom.Point(-r * 1.1, -r * 0.55), new Phaser.Geom.Point(-r * 1.3, 0),
      new Phaser.Geom.Point(-r * 1.1, r * 0.55), new Phaser.Geom.Point(r * 0.3, r * 0.7),
    ], true);
    g.lineStyle(2, COLORS.hull, 1);
    g.strokePoints([
      new Phaser.Geom.Point(r * 1.5, 0), new Phaser.Geom.Point(r * 0.3, -r * 0.7),
      new Phaser.Geom.Point(-r * 1.1, -r * 0.55), new Phaser.Geom.Point(-r * 1.3, 0),
      new Phaser.Geom.Point(-r * 1.1, r * 0.55), new Phaser.Geom.Point(r * 0.3, r * 0.7),
    ], true, true);
    // Cockpit dome
    g.fillStyle(COLORS.aetherHot, 0.95); g.fillCircle(r * 0.55, 0, r * 0.32);
    g.fillStyle(COLORS.white, 0.7); g.fillCircle(r * 0.62, -r * 0.08, r * 0.12);
    // Engine pods
    g.fillStyle(COLORS.hull, 1); g.fillCircle(-r * 1.05, -r * 0.4, r * 0.22); g.fillCircle(-r * 1.05, r * 0.4, r * 0.22);
    g.fillStyle(COLORS.aether, 1); g.fillCircle(-r * 1.1, -r * 0.4, r * 0.1); g.fillCircle(-r * 1.1, r * 0.4, r * 0.1);
    this.hullGfx = g;
    this.add(g);
  }

  /** dt seconds, thrust = {x,y,mag(0..1)}, boost held, night toggles headlight. */
  drive(dt: number, tx: number, ty: number, mag: number, boost: boolean, night: boolean): void {
    if (!this.alive) return;
    const empty = this.fuel <= 0;
    const spd = this.scene.time.now < this.speedUntil ? POWER.speedMult : 1;   // ember buff
    this.thrusting = mag > 0.12;                       // can still limp when out of fuel
    const boosting = boost && !empty && this.thrusting;
    // top speed: half when empty, ×boost when boosting, ×ember buff
    const maxV = this.topSpeed * spd * (empty ? SHIP.emptyFuelMult : (boosting ? BOOST.mult : 1));
    this.body.setMaxVelocity(maxV, maxV);

    if (this.thrusting) {
      const accel = this.accel * spd * (boosting ? BOOST.mult : 1) * (empty ? SHIP.emptyFuelMult : 1);
      this.body.setAcceleration(tx * accel, ty * accel);
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(ty, tx), SHIP.turnLerp * (dt * 60));
      if (!empty) this.fuel = Math.max(0, this.fuel - SHIP.fuelBurn * mag * (boosting ? BOOST.fuelMult : 1) * dt);
    } else {
      this.body.setAcceleration(0, 0);
      if (!empty) this.fuel = Math.max(0, this.fuel - SHIP.fuelIdle * dt);
      const sp = this.body.velocity.length();
      if (sp > 40) this.heading = Phaser.Math.Angle.RotateTo(this.heading, this.body.velocity.angle(), 0.05 * (dt * 60));
    }
    this.boosting = boosting;
    this.rotation = this.heading;

    // Engine glow pulses with throttle
    this.engineGlow.clear();
    if (this.thrusting) {
      const r = this.radius; const flick = 0.7 + Math.random() * 0.3;
      // layered fire: outer ember, mid amber, inner gold
      this.engineGlow.fillStyle(COLORS.ember, 0.45 * flick);
      this.engineGlow.fillTriangle(-r * 1.15, -r * 0.46, -r * 1.15, r * 0.46, -r * (2.1 + flick), 0);
      this.engineGlow.fillStyle(COLORS.amber, 0.6 * flick);
      this.engineGlow.fillTriangle(-r * 1.15, -r * 0.32, -r * 1.15, r * 0.32, -r * (1.7 + flick), 0);
      this.engineGlow.fillStyle(COLORS.gold, 0.9 * flick);
      this.engineGlow.fillTriangle(-r * 1.15, -r * 0.18, -r * 1.15, r * 0.18, -r * (1.4 + flick * 0.6), 0);
    }
    this.trail.emitting = this.thrusting;
    // trail sits at the stern (rotate offset by heading)
    const sx = this.x + Math.cos(this.heading + Math.PI) * this.radius * 1.2;
    const sy = this.y + Math.sin(this.heading + Math.PI) * this.radius * 1.2;
    this.trail.setPosition(sx, sy);

    this.headlight.setVisible(night);
    if (this.flashUntil && this.scene.time.now > this.flashUntil) { this.hullGfx.setAlpha(1); this.flashUntil = 0; }
  }

  /** Muzzle position + heading for a cannon shot. */
  muzzle(): { x: number; y: number; angle: number } {
    return { x: this.x + Math.cos(this.heading) * this.radius * 1.6, y: this.y + Math.sin(this.heading) * this.radius * 1.6, angle: this.heading };
  }

  cargoCount(): number { return ELEMENT_KINDS.reduce((s, k) => s + (this.cargo[k] ?? 0), 0); }
  cargoFull(): boolean { return this.cargoCount() >= this.cargoMax; }
  addCargo(kind: string): boolean { if (this.cargoFull()) return false; this.cargo[kind] = (this.cargo[kind] ?? 0) + 1; return true; }

  redActive(): boolean { return this.scene.time.now < this.redUntil; }
  healActive(): boolean { return this.scene.time.now < this.healUntil; }
  shieldActive(): boolean { return this.scene.time.now < this.shieldUntil; }
  applyPower(kind: PowerKind): void {
    const now = this.scene.time.now; const dur = POWERUPS[kind].durMs;
    if (kind === 'shield') this.shieldUntil = now + dur;
    else if (kind === 'speed') this.speedUntil = now + dur;
    else if (kind === 'redbullet') this.redUntil = now + dur;
    else if (kind === 'heal') this.healUntil = now + dur;
  }

  takeDamage(n: number): void {
    if (!this.alive || this.scene.time.now < this.invulnUntil) return;
    if (this.scene.time.now < this.shieldUntil) n *= POWER.shieldDmgMult;   // shield buff
    this.hp = Math.max(0, this.hp - n);
    this.hullGfx.setAlpha(0.4); this.flashUntil = this.scene.time.now + 90;
    this.invulnUntil = this.scene.time.now + 240;
    if (this.hp <= 0) this.alive = false;
  }
  refuel(n: number): void { this.fuel = Math.min(this.maxFuel, this.fuel + n); }
  repair(n: number): void { this.hp = Math.min(this.maxHp, this.hp + n); }

  destroy(fromScene?: boolean): void { this.trail?.destroy(); super.destroy(fromScene); }
}
export default PlayerShip;
