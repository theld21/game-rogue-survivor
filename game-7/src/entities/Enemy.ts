import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, ENEMIES, EnemyKind, SHIELD_ARC_HALF_DEG, ORBIT_SPEED, PHASE } from '../config.ts';

// =====================================================================
// Enemy.ts — grunt / shielded / ranged / orbiter / phaser. Kinematic.
//   shielded — static front-arc shield (chain from the open side).
//   orbiter  — front-arc shield that ROTATES around the body (time a gap).
//   phaser   — FULL-RING shield that BLINKS on/off (strike in the dark).
// Dynamic shields (orbiter/phaser) redraw on `tickShield(dt)`. The crosshair
// is a GSAP repeat:-1 tween, killed on destroy (leak-safe).
// =====================================================================

const SHIELD_ARC_HALF = Phaser.Math.DegToRad(SHIELD_ARC_HALF_DEG);

export class Enemy extends Phaser.GameObjects.Container {
  kind: EnemyKind;
  radius: number;
  score: number;
  alive = true;
  locked = false;
  facing: number;          // shield-facing angle (shielded / orbiter)
  phaseOn = true;          // phaser: is the ring currently up?

  private art!: Phaser.GameObjects.Graphics;
  private shieldGfx?: Phaser.GameObjects.Graphics;   // dynamic shield (orbiter/phaser)
  private crosshair!: Phaser.GameObjects.Graphics;
  private crosshairTween?: gsap.core.Tween;
  private fireTimer = 0;
  private stunUntil = 0;
  private stunTimer?: Phaser.Time.TimerEvent;
  private phaseTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, facing = -Math.PI / 2) {
    super(scene, x, y);
    const def = ENEMIES[kind];
    this.kind = kind;
    this.radius = def.radius;
    this.score = def.score;
    this.facing = facing;
    scene.add.existing(this);
    this.setDepth(30);

    this.crosshair = scene.add.graphics();
    this.add(this.crosshair);
    this.buildArt();
  }

  private buildArt(): void {
    const g = this.scene.add.graphics();
    const def = ENEMIES[this.kind];
    const r = this.radius;

    // Glow
    g.fillStyle(def.color, 0.14);
    g.fillCircle(0, 0, r * 1.6);

    if (this.kind === 'grunt') {
      // Hostile drone: diamond core
      g.fillStyle(0x18060c, 1);
      g.fillPoints([new Phaser.Geom.Point(0, -r), new Phaser.Geom.Point(r, 0), new Phaser.Geom.Point(0, r), new Phaser.Geom.Point(-r, 0)], true);
      g.lineStyle(2.2, def.color, 1);
      g.strokePoints([new Phaser.Geom.Point(0, -r), new Phaser.Geom.Point(r, 0), new Phaser.Geom.Point(0, r), new Phaser.Geom.Point(-r, 0)], true);
      g.fillStyle(def.color, 1); g.fillCircle(0, 0, 3);
    } else if (this.kind === 'shielded') {
      g.fillStyle(0x081420, 1); g.fillCircle(0, 0, r);
      g.lineStyle(2, def.color, 1); g.strokeCircle(0, 0, r);
      g.fillStyle(def.color, 1); g.fillCircle(0, 0, 3);
      // Static shield arc on the facing side
      this.strokeArc(g, this.facing, COLORS.shield);
    } else if (this.kind === 'ranged') {
      // Ranged sniper: hexagon with core
      const hex = this.regularPoly(6, r);
      g.fillStyle(0x1a1206, 1); g.fillPoints(hex, true);
      g.lineStyle(2.2, def.color, 1); g.strokePoints(hex, true);
      g.fillStyle(def.color, 1); g.fillCircle(0, 0, 3);
    } else if (this.kind === 'orbiter') {
      // Sentry: octagon body, eye; the orbiting arc lives on shieldGfx
      const oct = this.regularPoly(8, r);
      g.fillStyle(0x140a26, 1); g.fillPoints(oct, true);
      g.lineStyle(2.2, def.color, 1); g.strokePoints(oct, true);
      g.fillStyle(def.color, 1); g.fillCircle(0, 0, 3.4);
      g.lineStyle(1.2, def.color, 0.5); g.strokeCircle(0, 0, r * 0.55);
    } else {
      // Phantom (phaser): glitchy square-in-diamond, full ring on shieldGfx
      g.fillStyle(0x260a22, 1); g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      g.lineStyle(2.2, def.color, 1); g.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      g.fillStyle(def.color, 1); g.fillCircle(0, 0, 3.2);
    }
    this.art = g;
    this.add(g);

    if (this.kind === 'orbiter' || this.kind === 'phaser') {
      this.shieldGfx = this.scene.add.graphics();
      this.add(this.shieldGfx);
      this.drawShield();
    }
  }

  private regularPoly(sides: number, r: number): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < sides; i++) { const a = (i / sides) * Math.PI * 2 - Math.PI / 2; pts.push(new Phaser.Geom.Point(Math.cos(a) * r, Math.sin(a) * r)); }
    return pts;
  }

  private strokeArc(g: Phaser.GameObjects.Graphics, facing: number, color: number): void {
    g.lineStyle(4, color, 0.95);
    g.beginPath(); g.arc(0, 0, this.radius + 7, facing - SHIELD_ARC_HALF, facing + SHIELD_ARC_HALF); g.strokePath();
    g.lineStyle(2, COLORS.white, 0.6);
    g.beginPath(); g.arc(0, 0, this.radius + 4, facing - SHIELD_ARC_HALF, facing + SHIELD_ARC_HALF); g.strokePath();
  }

  /** Redraw the dynamic shield (orbiter arc / phaser ring). */
  private drawShield(): void {
    const g = this.shieldGfx; if (!g) return;
    g.clear();
    const r = this.radius;
    if (this.kind === 'orbiter') {
      this.strokeArc(g, this.facing, COLORS.violet);
      // a leading "gap" marker so the open side is readable
      const gapA = this.facing + Math.PI;
      g.fillStyle(COLORS.lime, 0.9); g.fillCircle(Math.cos(gapA) * (r + 6), Math.sin(gapA) * (r + 6), 2.6);
    } else {
      // phaser full ring
      if (this.phaseOn) {
        g.lineStyle(4, COLORS.glitch, 0.95); g.strokeCircle(0, 0, r + 7);
        g.lineStyle(2, COLORS.white, 0.55); g.strokeCircle(0, 0, r + 4);
      } else {
        g.lineStyle(1.5, COLORS.glitch, 0.22);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5), Math.cos(a + 0.3) * (r + 8), Math.sin(a + 0.3) * (r + 8)); }
      }
    }
  }

  /** Advance dynamic shields (dt is slow-mo scaled, so reads slow during aim). */
  tickShield(dt: number): void {
    if (!this.alive) return;
    if (this.kind === 'orbiter') {
      this.facing += ORBIT_SPEED * dt;
      this.drawShield();
    } else if (this.kind === 'phaser') {
      const period = PHASE.onMs + PHASE.offMs;
      this.phaseTimer = (this.phaseTimer + dt * 1000) % period;
      const on = this.phaseTimer < PHASE.onMs;
      if (on !== this.phaseOn) { this.phaseOn = on; this.drawShield(); }
    }
  }

  /** True if a dash approaching FROM (fromX,fromY) is blocked by this enemy's shield. */
  isFrontHit(fromX: number, fromY: number): boolean {
    if (this.kind === 'phaser') return this.phaseOn;            // full ring blocks any side while up
    if (this.kind !== 'shielded' && this.kind !== 'orbiter') return false;
    const ax = this.x - fromX, ay = this.y - fromY;
    const len = Math.hypot(ax, ay) || 1;
    const d = (ax / len) * Math.cos(this.facing) + (ay / len) * Math.sin(this.facing);
    return d < -Math.cos(SHIELD_ARC_HALF);                     // came in from the shielded side
  }

  lock(): void {
    if (this.locked || !this.alive) return;
    this.locked = true;
    this.drawCrosshair();
    this.crosshairTween = gsap.to(this.crosshair, { duration: 0.5, rotation: Math.PI / 2, scaleX: 0.78, scaleY: 0.78, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  unlock(): void {
    this.locked = false;
    this.crosshairTween?.kill(); this.crosshairTween = undefined;
    this.crosshair.clear(); this.crosshair.setScale(1).setRotation(0);
  }

  private drawCrosshair(): void {
    const g = this.crosshair; g.clear();
    const r = this.radius + 12;
    g.lineStyle(2, COLORS.lime, 0.95);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      g.lineBetween(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r - 7), Math.sin(a) * (r - 7));
    }
    g.strokeCircle(0, 0, r);
  }

  /** EMP / stun — suppress fire + visual flash. */
  stun(ms: number): void {
    if (!this.alive) return;
    this.stunUntil = Math.max(this.stunUntil, this.scene.time.now + ms);
    this.fireTimer = 0;
    this.art.setAlpha(0.45);
    this.stunTimer?.remove();
    this.stunTimer = this.scene.time.delayedCall(ms, () => { if (this.alive && this.active) this.art.setAlpha(1); });
  }

  /** Ranged enemies fire on a timer scaled by slow-mo dt. Returns a shot or null. */
  tickFire(dt: number, targetX: number, targetY: number): { angle: number } | null {
    if (this.kind !== 'ranged' || !this.alive) return null;
    if (this.scene.time.now < this.stunUntil) return null;
    this.fireTimer += dt * 1000;
    if (this.fireTimer >= ENEMIES.ranged.fireMs) {
      this.fireTimer = 0;
      return { angle: Math.atan2(targetY - this.y, targetX - this.x) };
    }
    return null;
  }

  destroy(fromScene?: boolean): void {
    this.alive = false;
    this.crosshairTween?.kill();
    this.stunTimer?.remove();
    super.destroy(fromScene);
  }
}

export default Enemy;
