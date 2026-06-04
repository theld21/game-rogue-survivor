import Phaser from 'phaser';
import Ship from './Ship.ts';
import { COLORS, PLAYER } from '../core/GameConfig.ts';
import { Container } from '../systems/Inventory.ts';
import CannonballPool from '../systems/CannonballPool.ts';
import Effects from '../systems/Effects.ts';
import AudioManager from '../core/AudioManager.ts';
import Storage from '../core/Storage.ts';

// =====================================================================
// PlayerShip.ts — The captain's vessel.
//
// Stats are the global PLAYER base + permanent upgrades from Storage.
// In-game buffs (from Harbour shop) are instance fields set by PlayScene:
//   damageMult, speedMult, fireCooldownMult, armorMult
// =====================================================================

export interface Targetable {
  x: number;
  y: number;
  alive: boolean;
}

export class PlayerShip extends Ship {
  cargo = new Container(PLAYER.cargoSlots);

  private steerX = 0;
  private steerY = 0;
  private throttle = 0;
  private fireReadyAt = 0;

  // Effective base stats (base + permanent upgrades)
  private effectiveMaxSpeed: number;
  private effectiveFireCooldown: number;

  // Per-raid buff multipliers (reset each level since PlayerShip is recreated)
  damageMult = 1;
  armorMult = 1;       // < 1 means less damage taken
  speedMult = 1;
  fireCooldownMult = 1; // < 1 = faster

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const maxHp = Storage.effectiveMaxHp(PLAYER.maxHp);
    super(scene, x, y, {
      maxHp,
      colors: { hull: COLORS.teal, sail: COLORS.cyan, accent: COLORS.gold },
      length: 60,
      bodyRadius: PLAYER.bodyRadius,
    });
    this.effectiveMaxSpeed = Storage.effectiveMaxSpeed(PLAYER.maxSpeed);
    this.effectiveFireCooldown = Storage.effectiveFireCooldown(PLAYER.fireCooldown);

    this.setDepth(30);
    this.body.setDrag(PLAYER.drag, PLAYER.drag);
    this.body.setMaxVelocity(this.effectiveMaxSpeed, this.effectiveMaxSpeed);
    this.heading = -Math.PI / 2;
    this.faceHeading();
  }

  setSteer(dx: number, dy: number): void {
    const mag = Math.hypot(dx, dy);
    if (mag < 0.001) { this.steerX = this.steerY = this.throttle = 0; return; }
    this.steerX = dx / mag;
    this.steerY = dy / mag;
    this.throttle = Phaser.Math.Clamp(mag, 0, 1);
  }

  clearSteer(): void { this.steerX = this.steerY = this.throttle = 0; }

  get isMoving(): boolean { return this.throttle > 0.05; }

  /** Apply an in-game buff for duration ms. PlayScene calls this when buying gear. */
  applyBuff(effect: string, mult: number, durationMs: number): void {
    switch (effect) {
      case 'dmg_boost':   this.damageMult = mult; break;
      case 'speed_boost': this.speedMult = mult; break;
      case 'armor':       this.armorMult = mult; break;
      case 'fire_rate':   this.fireCooldownMult = mult; break;
    }
    if (durationMs > 0) {
      this.scene.time.delayedCall(durationMs, () => {
        switch (effect) {
          case 'dmg_boost':   this.damageMult = 1; break;
          case 'speed_boost': this.speedMult = 1; break;
          case 'armor':       this.armorMult = 1; break;
          case 'fire_rate':   this.fireCooldownMult = 1; break;
        }
      });
    }
  }

  // Expose for collision damage calculations
  takeDamage(amount: number): void {
    super.takeDamage(Math.round(amount * this.armorMult));
  }

  update(delta: number, hostiles: Targetable[], pool: CannonballPool, fx: Effects): void {
    if (!this.alive) return;
    this.updateFlash();

    // Apply speed buff to velocity cap
    const curMaxSpeed = this.effectiveMaxSpeed * this.speedMult;
    this.body.setMaxVelocity(curMaxSpeed, curMaxSpeed);

    if (this.throttle > 0.05) {
      const a = PLAYER.accel * this.throttle;
      this.body.setAcceleration(this.steerX * a, this.steerY * a);
    } else {
      this.body.setAcceleration(0, 0);
    }

    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    if (Math.hypot(vx, vy) > 12) {
      const target = Math.atan2(vy, vx);
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, target, PLAYER.turnLerp * (delta / 16.67));
    }
    this.faceHeading();

    this.tryFire(hostiles, pool, fx);
  }

  private tryFire(hostiles: Targetable[], pool: CannonballPool, fx: Effects): void {
    const now = this.scene.time.now;
    const cooldown = this.effectiveFireCooldown * this.fireCooldownMult;
    if (now < this.fireReadyAt) return;
    const target = this.nearestInRange(hostiles, PLAYER.cannonRange);
    if (!target) return;

    this.fireReadyAt = now + cooldown;

    // Single cannonball fired from the side facing the target
    const toTarget = Math.atan2(target.y - this.y, target.x - this.x);
    const leftDiff = Math.abs(Phaser.Math.Angle.Wrap(this.heading - Math.PI / 2 - toTarget));
    const rightDiff = Math.abs(Phaser.Math.Angle.Wrap(this.heading + Math.PI / 2 - toTarget));
    const side = leftDiff < rightDiff ? this.heading - Math.PI / 2 : this.heading + Math.PI / 2;

    const ox = this.x + Math.cos(side) * this.bodyRadius;
    const oy = this.y + Math.sin(side) * this.bodyRadius;
    const aim = Math.atan2(target.y - oy, target.x - ox);
    pool.fire(ox, oy, aim, 'player', Math.round(PLAYER.cannonDamage * this.damageMult));
    fx.muzzleFlash(ox, oy, COLORS.cyan);
    AudioManager.cannon();
  }

  private nearestInRange(hostiles: Targetable[], range: number): Targetable | null {
    let best: Targetable | null = null;
    let bestD = range * range;
    for (const h of hostiles) {
      if (!h.alive) continue;
      const d = (h.x - this.x) ** 2 + (h.y - this.y) ** 2;
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }
}

export default PlayerShip;
