import Phaser from 'phaser';
import { COLORS } from '../../core/GameConfig.ts';

// =====================================================================
// Island.ts — Base landmass.
//
// STATIC BODY CENTERING (Phaser 3.90):
//   physics.add.existing(container, true) calls getBounds() on the
//   Container.  With no children yet, getBounds returns (x, y, 0, 0),
//   so body.position = (x, y).  After setCircle(r) the body is 2r×2r
//   but the top-left is still at (x, y) → center is (x+r, y+r), wrong.
//
//   Fix: call setOffset(-r, -r) which shifts body.position by (-r, -r)
//   and re-inserts into the staticTree via the public Phaser API.
//   Result: body.position = (x-r, y-r) → center = (x, y) ✓
// =====================================================================

export abstract class Island extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.StaticBody;
  radius: number;
  protected art!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    super(scene, x, y);
    this.radius = radius;
    scene.add.existing(this);
    this.setDepth(10);

    // 1. Create static body (body.position = (x, y) from getBounds of empty Container)
    scene.physics.add.existing(this, true);
    // 2. Set circle shape (body stays at top-left (x,y), width=2r → center is at (x+r, y+r))
    this.body.setCircle(radius);
    // 3. Shift body left-up by r so center lands exactly on (x, y).
    //    setOffset handles staticTree remove/insert internally (public API).
    this.body.setOffset(-radius, -radius);

    this.art = scene.add.graphics();
    this.add(this.art);
    this.drawLand(this.art, radius);
  }

  protected drawLand(g: Phaser.GameObjects.Graphics, r: number, rimColor = COLORS.teal): void {
    const seed = (this.x * 13 + this.y * 7) % 1000;
    const pts: Phaser.Geom.Point[] = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 0.78 + 0.22 * Math.sin(seed + i * 1.7) + 0.12 * Math.cos(seed * 0.5 + i * 3.1);
      pts.push(new Phaser.Geom.Point(Math.cos(a) * r * wob, Math.sin(a) * r * wob));
    }

    g.fillStyle(COLORS.seaShallow, 0.5);
    g.fillCircle(0, 0, r * 1.18);

    g.fillStyle(COLORS.sand, 0.9);
    g.fillPoints(pts, true);

    const inner = pts.map((p) => new Phaser.Geom.Point(p.x * 0.74, p.y * 0.74));
    g.fillStyle(0x12331f, 1);
    g.fillPoints(inner, true);

    g.lineStyle(2.5, rimColor, 0.9);
    g.strokePoints(pts, true);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + seed;
      const rr = r * (0.15 + 0.3 * ((seed + i) % 3) / 3);
      g.fillStyle(i % 2 ? COLORS.green : 0x1f4d2e, 0.9);
      g.fillCircle(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.1);
    }
  }

  protected drawDockRing(dockRadius: number, color: number): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(2, color, 0.22);
    ring.strokeCircle(0, 0, dockRadius);
    ring.setDepth(2);
    this.addAt(ring, 0);
  }

  distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.x, this.y, x, y);
  }
}

export default Island;
