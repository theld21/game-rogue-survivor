import Phaser from 'phaser';
import Ship from './Ship.ts';
import PlayerShip from './PlayerShip.ts';
import { COLORS } from '../core/GameConfig.ts';
import CannonballPool from '../systems/CannonballPool.ts';
import Effects from '../systems/Effects.ts';
import AudioManager from '../core/AudioManager.ts';

// =====================================================================
// EnemyShip.ts — Hostile vessels.
//   'patrol'   — roams freely, gives up if player escapes far enough.
//   'guardian' — tethered to Skull Island leash circle.
//
// HP regen: if the enemy hasn't fired for 30 s it slowly recovers
// (2 HP/s) to recover between engagements.
// Convergence: when skull.triggered the scene sets converge=true, forcing
// all patrols to also chase the player regardless of normal aggro range.
// =====================================================================

export type EnemyKind = 'patrol' | 'guardian';
type State = 'patrol' | 'chase' | 'return';

export interface EnemyConfig {
  kind: EnemyKind;
  maxHp: number;
  damage: number;
  anchor: Phaser.Math.Vector2;
  leashRadius: number;
  bounds: Phaser.Geom.Rectangle;
  speed?: number;
}

export class EnemyShip extends Ship {
  kind: EnemyKind;
  damage: number;
  private anchor: Phaser.Math.Vector2;
  private leashRadius: number;
  private bounds: Phaser.Geom.Rectangle;

  private aiState: State = 'patrol';
  private accelVal: number;
  private aggroRange = 540;
  private cannonRange = 340;
  private fireCooldown: number;
  private fireReadyAt = 0;
  private lastFiredAt = 0;           // for HP regen
  private regenAccum = 0;
  private wanderTarget = new Phaser.Math.Vector2();
  private nextWanderAt = 0;

  // Scene sets this to true when the skull is triggered
  converge = false;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: EnemyConfig) {
    const isGuardian = cfg.kind === 'guardian';
    super(scene, x, y, {
      maxHp: cfg.maxHp,
      colors: isGuardian
        ? { hull: COLORS.guardian, sail: COLORS.crimson, accent: COLORS.gold }
        : { hull: COLORS.crimson, sail: COLORS.ember, accent: COLORS.gold },
      length: isGuardian ? 58 : 50,
      bodyRadius: isGuardian ? 24 : 20,
    });
    this.kind = cfg.kind;
    this.damage = cfg.damage;
    this.anchor = cfg.anchor.clone();
    this.leashRadius = cfg.leashRadius;
    this.bounds = cfg.bounds;
    this.setDepth(28);

    const speed = cfg.speed ?? (isGuardian ? 195 : 165);
    this.accelVal = isGuardian ? 420 : 360;
    this.fireCooldown = isGuardian ? 1000 : 1350;
    this.aggroRange = isGuardian ? 560 : 520;

    this.body.setDrag(260, 260);
    this.body.setMaxVelocity(speed, speed);
    this.pickWander();
  }

  private pickWander(): void {
    if (this.leashRadius > 0) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * this.leashRadius * 0.8;
      this.wanderTarget.set(this.anchor.x + Math.cos(a) * r, this.anchor.y + Math.sin(a) * r);
    } else {
      const m = 300;
      this.wanderTarget.set(
        Phaser.Math.Between(this.bounds.x + m, this.bounds.right - m),
        Phaser.Math.Between(this.bounds.y + m, this.bounds.bottom - m),
      );
    }
    this.nextWanderAt = this.scene.time.now + Phaser.Math.Between(2500, 5000);
  }

  /**
   * @param peers - all enemy ships in the scene; used for separation steering
   *   so ships that pile up on the same target push each other apart instead
   *   of permanently fusing (no physics collider between enemies by design to
   *   avoid the "locked-together" arcade-physics deadlock).
   */
  update(delta: number, player: PlayerShip, pool: CannonballPool, fx: Effects, peers: EnemyShip[] = []): void {
    if (!this.alive) return;
    this.updateFlash();

    const now = this.scene.time.now;
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const distFromAnchor = Phaser.Math.Distance.Between(this.x, this.y, this.anchor.x, this.anchor.y);
    const playerFromAnchor = Phaser.Math.Distance.Between(player.x, player.y, this.anchor.x, this.anchor.y);

    // ---- Decide AI state ----
    if (this.converge && player.alive) {
      this.aiState = 'chase';
    } else if (this.leashRadius > 0) {
      if (distFromAnchor > this.leashRadius * 1.04) {
        this.aiState = 'return';
      } else if (player.alive && playerFromAnchor < this.leashRadius && distToPlayer < this.aggroRange) {
        this.aiState = 'chase';
      } else {
        this.aiState = 'patrol';
      }
    } else {
      if (player.alive && distToPlayer < this.aggroRange) this.aiState = 'chase';
      else if (this.aiState === 'chase' && distToPlayer > this.aggroRange * 1.5) this.aiState = 'patrol';
      else if (this.aiState === 'chase' && !player.alive) this.aiState = 'patrol';
    }

    // ---- Steer ----
    let steerX = 0, steerY = 0;
    if (this.aiState === 'chase') {
      steerX = player.x - this.x; steerY = player.y - this.y;
    } else if (this.aiState === 'return') {
      steerX = this.anchor.x - this.x; steerY = this.anchor.y - this.y;
    } else {
      const dw = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
      if (dw < 60 || now > this.nextWanderAt) this.pickWander();
      steerX = this.wanderTarget.x - this.x; steerY = this.wanderTarget.y - this.y;
    }

    // ---- Peer separation: repel from nearby friendly ships ----
    // Without this, enemies chasing the same target pile up perfectly and
    // appear fused because arcade physics has no enemy↔enemy collider.
    for (const peer of peers) {
      if (peer === this || !peer.alive) continue;
      const pdx = this.x - peer.x;
      const pdy = this.y - peer.y;
      const pd  = Math.hypot(pdx, pdy);
      const minD = this.bodyRadius + peer.bodyRadius + 24;
      if (pd < minD && pd > 0.1) {
        const strength = (minD - pd) / minD * 3.0;
        steerX += (pdx / pd) * strength;
        steerY += (pdy / pd) * strength;
      }
    }

    const mag = Math.hypot(steerX, steerY) || 1;
    this.body.setAcceleration((steerX / mag) * this.accelVal, (steerY / mag) * this.accelVal);

    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    if (Math.hypot(vx, vy) > 10) {
      this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(vy, vx), 0.08 * (delta / 16.67));
    }
    this.faceHeading();

    // ---- Fire ----
    if (this.aiState === 'chase' && distToPlayer < this.cannonRange && now >= this.fireReadyAt) {
      this.fireReadyAt = now + this.fireCooldown;
      this.lastFiredAt = now;
      this.regenAccum = 0;
      const aim = Math.atan2(player.y - this.y, player.x - this.x);
      const ox = this.x + Math.cos(aim) * this.bodyRadius;
      const oy = this.y + Math.sin(aim) * this.bodyRadius;
      pool.fire(ox, oy, aim, 'enemy', this.damage);
      fx.muzzleFlash(ox, oy, COLORS.crimson);
      AudioManager.cannon();
    }

    // ---- Slow HP regen after 30 s without firing ----
    if (now - this.lastFiredAt > 30000 && this.hp < this.maxHp) {
      this.regenAccum += delta;
      if (this.regenAccum >= 500) {   // 2 HP every 500 ms = 4 HP/s (slow)
        this.heal(2);
        this.regenAccum -= 500;
      }
    }
  }
}

export default EnemyShip;
