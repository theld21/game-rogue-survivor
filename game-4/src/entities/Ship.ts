import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig.ts';

// =====================================================================
// Ship.ts — Base vessel.
//
// A Ship is a Container holding all-vector art (drawn once, never per-frame):
//   - a rotating `hull` sub-container (bow points +x, rotated to heading)
//   - an upright neon HP bar that floats above and follows the ship
// The arcade physics body is a CIRCLE kept separate from the drawn hull
// (AABB/circle bodies can't match a vector silhouette — advisor note #4).
// =====================================================================

export interface ShipColors {
  hull: number;
  sail: number;
  accent: number;
}

export abstract class Ship extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  hp: number;
  maxHp: number;
  heading = 0; // radians, 0 = facing +x (east)
  alive = true;

  protected hull!: Phaser.GameObjects.Container;
  protected hpBar!: Phaser.GameObjects.Graphics;
  protected shipColors: ShipColors;
  protected shipLength: number;
  bodyRadius: number;

  private hitFlashUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    opts: { maxHp: number; colors: ShipColors; length?: number; bodyRadius?: number },
  ) {
    super(scene, x, y);
    this.maxHp = opts.maxHp;
    this.hp = opts.maxHp;
    this.shipColors = opts.colors;
    this.shipLength = opts.length ?? 56;
    this.bodyRadius = opts.bodyRadius ?? this.shipLength * 0.4;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(this.bodyRadius, -this.bodyRadius, -this.bodyRadius);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.2);

    this.buildArt();
  }

  private buildArt(): void {
    this.hull = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    this.drawHull(g, this.shipLength, this.shipColors);
    this.hull.add(g);
    this.add(this.hull);

    this.hpBar = this.scene.add.graphics();
    this.add(this.hpBar);
    this.redrawHpBar();
  }

  /** Draw a stylised neon ship pointing +x, centred on origin. */
  protected drawHull(g: Phaser.GameObjects.Graphics, len: number, c: ShipColors): void {
    const L = len;
    const W = len * 0.5;

    // Soft hull glow
    g.fillStyle(c.hull, 0.12);
    g.fillEllipse(0, 0, L * 1.25, W * 1.5);

    // Hull silhouette (bow at +x)
    const hullPts: number[] = [
      0.52 * L, 0,
      0.26 * L, -0.5 * W,
      -0.42 * L, -0.46 * W,
      -0.5 * L, -0.22 * W,
      -0.5 * L, 0.22 * W,
      -0.42 * L, 0.46 * W,
      0.26 * L, 0.5 * W,
    ];
    g.fillStyle(0x081826, 0.96);
    g.fillPoints(this.toPoints(hullPts), true);
    g.lineStyle(2.5, c.hull, 1);
    g.strokePoints(this.toPoints(hullPts), true);

    // Deck stripe
    g.lineStyle(2, c.accent, 0.8);
    g.beginPath();
    g.moveTo(-0.4 * L, 0);
    g.lineTo(0.46 * L, 0);
    g.strokePath();

    // Mast
    g.fillStyle(c.accent, 1);
    g.fillCircle(0.02 * L, 0, 3);

    // Twin neon sails (triangles flanking the mast, perpendicular to hull)
    g.fillStyle(c.sail, 0.85);
    g.fillTriangle(0.02 * L, -2, 0.02 * L, -0.62 * W, 0.34 * L, -0.2 * W);
    g.fillTriangle(0.02 * L, 2, 0.02 * L, 0.62 * W, 0.34 * L, 0.2 * W);
    g.lineStyle(1.5, c.hull, 0.9);
    g.strokeTriangle(0.02 * L, -2, 0.02 * L, -0.62 * W, 0.34 * L, -0.2 * W);
    g.strokeTriangle(0.02 * L, 2, 0.02 * L, 0.62 * W, 0.34 * L, 0.2 * W);

    // Bow lantern
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(0.5 * L, 0, 2.5);
  }

  private toPoints(flat: number[]): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  protected redrawHpBar(): void {
    const w = Math.max(34, this.shipLength * 0.7);
    const h = 5;
    const y = -this.shipLength * 0.62;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const g = this.hpBar;
    g.clear();
    // Back plate
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(-w / 2 - 2, y - 2, w + 4, h + 4, 3);
    // Empty track
    g.fillStyle(0x123, 0.9);
    g.fillRoundedRect(-w / 2, y, w, h, 2);
    // Fill — green→gold→crimson by health
    const col = ratio > 0.5 ? COLORS.green : ratio > 0.25 ? COLORS.gold : COLORS.crimson;
    g.fillStyle(col, 1);
    g.fillRoundedRect(-w / 2, y, Math.max(1, w * ratio), h, 2);
  }

  /** Rotate hull art to face current heading (call from update). */
  protected faceHeading(): void {
    this.hull.rotation = this.heading;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.redrawHpBar();
    this.hitFlashUntil = this.scene.time.now + 90;
    this.hull.setAlpha(0.4);
    if (this.hp <= 0) this.alive = false;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.redrawHpBar();
  }

  healFull(): void {
    this.hp = this.maxHp;
    this.redrawHpBar();
  }

  protected updateFlash(): void {
    if (this.hitFlashUntil && this.scene.time.now > this.hitFlashUntil) {
      this.hull.setAlpha(1);
      this.hitFlashUntil = 0;
    }
  }
}

export default Ship;
