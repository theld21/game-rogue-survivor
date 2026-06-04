import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, GUN } from '../config.ts';
import Item from './Item.ts';
import GameState from '../core/GameState.ts';
import AudioManager from '../core/AudioManager.ts';

// =====================================================================
// Gun.ts — The sweeping laser / mechanical claw at the ship's nose.
//
// A single barrel oscillates across a 160° arc above the ship. Tapping
// does one of two things depending on the GLOBAL mode:
//
//   SHOOT  — fire a laser bolt along the current sweep angle (sweep keeps
//            going). The scene resolves laser↔asteroid hits.
//   CLAW   — freeze the angle and launch a mechanical claw that EXTENDS to
//            clawMaxLength, then RETRACTS. The claw head is purely kinematic
//            (anchor + frozenAngle × length) — never an arcade projectile,
//            which sidesteps physics-body offset pitfalls. Distance-checks
//            grab the first item it touches; retract speed scales by 1/weight.
//
// Angle convention: 0 rad = straight UP. Positive = clockwise (toward +x).
// =====================================================================

export type GunMode = 'shoot' | 'claw';
type ClawState = 'idle' | 'extending' | 'retracting';

export class Gun extends Phaser.GameObjects.Container {
  mode: GunMode = 'shoot';

  // Callbacks wired by the scene
  onFireLaser?: (x: number, y: number, angleRad: number, damage: number) => void;
  onCollect?: (item: Item) => void;
  onModeChange?: (mode: GunMode) => void;
  onEnergyDrain?: (amount: number) => void;

  private sweepAngle = 0;          // radians from straight-up (claw aiming)
  private sweepDir = 1;
  private lastShootAngle = 0;      // last tap-to-aim direction (shoot mode)
  private fireReadyAt = 0;
  private frozenUntil = 0;         // gun disabled (frost hazard) until this time

  private clawState: ClawState = 'idle';
  private clawLength = 0;
  private clawAngle = 0;           // frozen at launch
  private grabbed: Item | null = null;

  private barrel!: Phaser.GameObjects.Graphics;
  private aimGuide!: Phaser.GameObjects.Graphics;
  private clawGfx!: Phaser.GameObjects.Graphics;
  private clawOpen = 1;            // 1 = open, 0 = closed (for GSAP tween)

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(41);

    this.aimGuide = scene.add.graphics(); this.add(this.aimGuide);
    this.clawGfx = scene.add.graphics();  this.add(this.clawGfx);
    this.buildBarrel();
  }

  private buildBarrel(): void {
    const g = this.scene.add.graphics();
    // Pivot housing
    g.fillStyle(0x1a2440, 1);
    g.fillCircle(0, 0, 12);
    g.lineStyle(2, COLORS.cyan, 1);
    g.strokeCircle(0, 0, 12);
    g.fillStyle(COLORS.cyan, 0.8);
    g.fillCircle(0, 0, 4);
    this.barrel = g;
    this.add(g);
  }

  // -- Mode control -----------------------------------------------------
  setMode(mode: GunMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.onModeChange?.(mode);
  }

  /** Toggle shoot <-> claw (ignored while the claw is mid-flight). */
  toggleMode(): void {
    if (this.isClawBusy) return;
    this.setMode(this.mode === 'shoot' ? 'claw' : 'shoot');
  }

  get isClawBusy(): boolean { return this.clawState !== 'idle'; }
  get isFrozen(): boolean { return this.scene.time.now < this.frozenUntil; }

  /** Frost hazard: disable the gun for `ms` milliseconds. */
  freeze(ms: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, this.scene.time.now + ms);
  }

  // -- Tap handler ------------------------------------------------------
  // SHOOT: tap aims & fires toward the tapped point.
  // CLAW : tap launches the claw along the sweep angle (sweep = aiming).
  handleTap(px?: number, py?: number): void {
    if (this.isFrozen) return;
    if (this.mode === 'shoot') {
      this.fireLaserAt(px, py);
    } else {
      if (this.clawState === 'idle') this.launchClaw();
    }
  }

  private fireLaserAt(px?: number, py?: number): void {
    const now = this.scene.time.now;
    if (now < this.fireReadyAt) return;
    this.fireReadyAt = now + GUN.laserCooldownMs;

    let ang: number;
    if (px !== undefined && py !== undefined) {
      // Aim toward the tapped point. 0 rad = straight up; clamp to the
      // forward half so you can't fire backwards past the wings.
      ang = Math.atan2(px - this.x, -(py - this.y));
      const lim = Phaser.Math.DegToRad(82);
      ang = Phaser.Math.Clamp(ang, -lim, lim);
    } else {
      ang = this.lastShootAngle;
    }
    this.lastShootAngle = ang;

    const muzzleLen = 16;
    const mx = this.x + Math.sin(ang) * muzzleLen;
    const my = this.y - Math.cos(ang) * muzzleLen;
    const dmg = Math.round(GUN.laserBaseDamage * GameState.laserDamageMult());
    this.onFireLaser?.(mx, my, ang, dmg);
    AudioManager.laser();

    gsap.fromTo(this.barrel, { y: 0 }, { y: 4, duration: 0.05, yoyo: true, repeat: 1, ease: 'none' });
  }

  private launchClaw(): void {
    this.clawState = 'extending';
    this.clawLength = 0;
    this.clawAngle = this.sweepAngle;   // freeze at current sweep
    this.clawOpen = 1;
    AudioManager.clawLaunch();
  }

  // -- Per-frame update -------------------------------------------------
  update(delta: number, items: Item[]): void {
    const dt = delta / 1000;

    // Sweep only matters in CLAW mode (it's the claw's aim). Freeze it while
    // the claw is out or the gun is frost-locked.
    if (this.mode === 'claw' && this.clawState === 'idle' && !this.isFrozen) {
      const half = Phaser.Math.DegToRad(GUN.sweepDegrees / 2);
      const speed = Phaser.Math.DegToRad(GUN.sweepSpeedDeg);
      this.sweepAngle += this.sweepDir * speed * dt;
      if (this.sweepAngle > half) { this.sweepAngle = half; this.sweepDir = -1; }
      else if (this.sweepAngle < -half) { this.sweepAngle = -half; this.sweepDir = 1; }
    }

    // Claw kinematics
    if (this.clawState !== 'idle') this.updateClaw(dt, items);

    this.draw();
  }

  private updateClaw(dt: number, items: Item[]): void {
    const speedMult = GameState.clawSpeedMult();

    if (this.clawState === 'extending') {
      this.clawLength += GUN.clawBaseExtendSpeed * speedMult * dt;
      // Check for a grab
      if (!this.grabbed) {
        const head = this.headPos();
        for (const it of items) {
          if (it.state !== 'free') continue;
          if (Phaser.Math.Distance.Between(head.x, head.y, it.x, it.y) < GUN.clawHeadRadius + 14) {
            this.grabItem(it);
            break;
          }
        }
      }
      if (this.clawLength >= GUN.clawMaxLength || this.grabbed) {
        this.clawState = 'retracting';
        if (this.grabbed) {
          // snap claw to the item so it doesn't overshoot
          const head = this.headPos();
          this.clawLength = Phaser.Math.Distance.Between(this.x, this.y, this.grabbed.x, this.grabbed.y);
          void head;
        }
      }
    } else if (this.clawState === 'retracting') {
      const weight = this.grabbed ? this.grabbed.weight : 1;
      const retract = (GUN.clawBaseRetractSpeed * speedMult) / weight;
      this.clawLength -= retract * dt;

      // Drain energy while hauling a heavy item
      if (this.grabbed && this.grabbed.weight > 1) {
        this.onEnergyDrain?.(GUN.clawEnergyPerSec * GameState.fuelDrainMult() * dt);
      }

      // Keep the grabbed item glued to the head
      if (this.grabbed) {
        const head = this.headPos();
        this.grabbed.x = head.x;
        this.grabbed.y = head.y;
      }

      if (this.clawLength <= 0) {
        this.clawLength = 0;
        this.finishClaw();
      }
    }
  }

  private grabItem(it: Item): void {
    it.grab();
    this.grabbed = it;
    AudioManager.clawGrab();
    // Snap the claw closed with a GSAP tween
    gsap.to(this, { clawOpen: 0, duration: 0.12, ease: 'power2.in' });
  }

  private finishClaw(): void {
    if (this.grabbed) {
      const item = this.grabbed;
      this.grabbed = null;
      this.onCollect?.(item);
    }
    this.clawState = 'idle';
    this.clawOpen = 1;
    // Stay in claw mode so the player can keep harvesting; switching back
    // to shoot is now a manual toggle.
  }

  // -- Geometry helpers -------------------------------------------------
  /** World position of the claw head. */
  private headPos(): { x: number; y: number } {
    const a = this.clawAngle;
    return {
      x: this.x + Math.sin(a) * this.clawLength,
      y: this.y - Math.cos(a) * this.clawLength,
    };
  }

  // -- Rendering --------------------------------------------------------
  private draw(): void {
    this.drawAimGuide();
    this.drawBarrelRotation();
    this.drawClaw();
  }

  private drawAimGuide(): void {
    const g = this.aimGuide;
    g.clear();
    if (this.clawState !== 'idle') return;   // hide guide while claw out

    if (this.mode === 'claw') {
      // CLAW: long sweeping targeting line (the aim mechanic)
      this.drawGuideLine(g, this.sweepAngle, this.isFrozen ? COLORS.ice : COLORS.gold, 185, true);
    } else {
      // SHOOT: short hint toward the last tapped direction (tap anywhere to aim)
      this.drawGuideLine(g, this.lastShootAngle, this.isFrozen ? COLORS.ice : COLORS.cyan, 64, false);
    }
  }

  private drawGuideLine(g: Phaser.GameObjects.Graphics, a: number, col: number, len: number, reticle: boolean): void {
    const ex = Math.sin(a) * len;
    const ey = -Math.cos(a) * len;
    g.lineStyle(2, col, 0.35);
    const segs = reticle ? 10 : 5;
    for (let i = 0; i < segs; i += 2) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      g.lineBetween(ex * t0, ey * t0, ex * t1, ey * t1);
    }
    if (reticle) {
      g.lineStyle(2, col, 0.7);
      g.strokeCircle(ex, ey, 8);
      g.lineBetween(ex - 12, ey, ex - 6, ey);
      g.lineBetween(ex + 6, ey, ex + 12, ey);
    } else {
      g.fillStyle(col, 0.8);
      g.fillCircle(ex, ey, 3);
    }
  }

  private drawBarrelRotation(): void {
    // Barrel faces the relevant aim: sweep for claw, last-shot for shoot.
    const face = this.clawState !== 'idle' ? this.clawAngle
      : this.mode === 'claw' ? this.sweepAngle : this.lastShootAngle;
    this.barrel.setRotation(face);
  }

  private drawClaw(): void {
    const g = this.clawGfx;
    g.clear();
    if (this.clawState === 'idle') return;

    const head = this.headPos();
    const hx = head.x - this.x;   // local coords (container space)
    const hy = head.y - this.y;
    const a = this.clawAngle;

    // ── Chain cable: a row of mechanical links ──────────────────────
    const linkCount = Math.max(1, Math.floor(this.clawLength / 16));
    const ux = Math.sin(a), uy = -Math.cos(a);  // unit dir
    // Cable base line (dark)
    g.lineStyle(5, 0x223052, 1);
    g.lineBetween(0, 0, hx, hy);
    // Link highlights
    for (let i = 0; i < linkCount; i++) {
      const t = (i + 0.5) / linkCount;
      const lx = ux * this.clawLength * t;
      const ly = uy * this.clawLength * t;
      // perpendicular nub to suggest a chain link
      const px = -uy, py = ux;
      g.lineStyle(2, COLORS.cyan, 0.7);
      g.lineBetween(lx - px * 3, ly - py * 3, lx + px * 3, ly + py * 3);
    }
    // Glowing cable core
    g.lineStyle(1.5, COLORS.cyan, 0.5);
    g.lineBetween(0, 0, hx, hy);

    // ── Claw head: 3-prong gripper ──────────────────────────────────
    const spread = 0.5 + this.clawOpen * 0.6;   // radians the prongs splay
    const prongLen = 18;
    this.drawProngs(g, hx, hy, a, spread, prongLen);

    // Central hub
    g.fillStyle(0x2a3858, 1);
    g.fillCircle(hx, hy, 8);
    g.lineStyle(2, COLORS.cyan, 1);
    g.strokeCircle(hx, hy, 8);
    g.fillStyle(this.grabbed ? COLORS.gold : COLORS.cyan, 1);
    g.fillCircle(hx, hy, 3.5);
  }

  private drawProngs(g: Phaser.GameObjects.Graphics, hx: number, hy: number, a: number, spread: number, len: number): void {
    // Three prongs: one along the aim, two splayed by ±spread
    const angles = [a, a - spread, a + spread];
    for (const pa of angles) {
      const ex = hx + Math.sin(pa) * len;
      const ey = hy - Math.cos(pa) * len;
      // Mid-knuckle so prongs look mechanical, not straight sticks
      const mx = hx + Math.sin(pa) * len * 0.5 + Math.sin(pa + 0.4) * 4;
      const my = hy - Math.cos(pa) * len * 0.5 - Math.cos(pa + 0.4) * 4;
      g.lineStyle(4, 0x4a5878, 1);
      g.lineBetween(hx, hy, mx, my);
      g.lineBetween(mx, my, ex, ey);
      // Glow edge + claw tip
      g.lineStyle(1.5, COLORS.cyan, 0.8);
      g.lineBetween(hx, hy, mx, my);
      g.fillStyle(COLORS.cyan, 1);
      g.fillCircle(ex, ey, 2.5);
    }
  }

  /** Force the claw home instantly (e.g. on level end). */
  forceReset(): void {
    if (this.grabbed) { this.grabbed.state = 'free'; this.grabbed = null; }
    this.clawState = 'idle';
    this.clawLength = 0;
    this.clawOpen = 1;
  }
}

export default Gun;
