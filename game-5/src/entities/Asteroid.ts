import Phaser from 'phaser';
import { COLORS, ASTEROIDS, AsteroidKind, ItemKind, ITEMS } from '../config.ts';
import GameState from '../core/GameState.ts';

// =====================================================================
// Asteroid.ts — Destructible space rock holding one item.
//
// Three archetypes (rock / ice / magma) with distinct vector silhouettes
// and palettes. Takes laser damage; when HP hits zero the scene shatters
// it (fragment particles) and releases the hidden item. The Radar upgrade
// reveals a preview of the contained item before it's cracked open.
// =====================================================================

export class Asteroid extends Phaser.GameObjects.Container {
  kind: AsteroidKind;
  hp: number;
  maxHp: number;
  radius: number;
  contains: ItemKind;
  cracked = false;

  private art!: Phaser.GameObjects.Graphics;
  private hpRing!: Phaser.GameObjects.Graphics;
  private radarHint?: Phaser.GameObjects.Container;
  private spinSpeed: number;
  private vertices: number[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, kind: AsteroidKind, contains: ItemKind) {
    super(scene, x, y);
    const def = ASTEROIDS[kind];
    this.kind = kind;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.radius = def.radius;
    this.contains = contains;
    this.spinSpeed = (Math.random() - 0.5) * 0.4;
    scene.add.existing(this);
    this.setDepth(20);

    this.buildArt();
    this.hpRing = scene.add.graphics();
    this.add(this.hpRing);
    this.maybeShowRadar();
  }

  private buildArt(): void {
    const g = this.scene.add.graphics();
    const def = ASTEROIDS[this.kind];
    const r = this.radius;

    // Irregular silhouette — jagged polygon seeded from position
    const seed = (this.x * 13 + this.y * 7) % 1000;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 0.74 + 0.26 * Math.abs(Math.sin(seed + i * 2.3)) + 0.1 * Math.cos(seed * 0.3 + i * 4.1);
      this.vertices.push(Math.cos(a) * r * wob, Math.sin(a) * r * wob);
    }
    const pts = this.toPts(this.vertices);

    // Outer glow
    g.fillStyle(def.glow, 0.12);
    g.fillCircle(0, 0, r * 1.25);

    // Body
    g.fillStyle(def.tint, 1);
    g.fillPoints(pts, true);

    // Per-kind surface detailing
    if (this.kind === 'rock') this.detailRock(g, r);
    else if (this.kind === 'ice') this.detailIce(g, r);
    else this.detailMagma(g, r);

    // Neon rim
    g.lineStyle(2.5, def.glow, 0.9);
    g.strokePoints(pts, true);

    this.art = g;
    this.add(g);
  }

  private detailRock(g: Phaser.GameObjects.Graphics, r: number): void {
    // Craters
    g.fillStyle(COLORS.rockDark, 0.9);
    g.fillCircle(-r * 0.2, -r * 0.15, r * 0.22);
    g.fillCircle(r * 0.3, r * 0.2, r * 0.16);
    g.fillCircle(r * 0.05, r * 0.35, r * 0.12);
    // Crater rims
    g.lineStyle(1.5, 0x868e9c, 0.6);
    g.strokeCircle(-r * 0.2, -r * 0.15, r * 0.22);
    g.strokeCircle(r * 0.3, r * 0.2, r * 0.16);
  }

  private detailIce(g: Phaser.GameObjects.Graphics, r: number): void {
    // Glowing fracture lines
    g.lineStyle(2, COLORS.ice, 0.9);
    g.lineBetween(-r * 0.4, -r * 0.3, r * 0.2, r * 0.1);
    g.lineBetween(r * 0.2, r * 0.1, r * 0.1, r * 0.5);
    g.lineBetween(r * 0.2, r * 0.1, r * 0.5, -r * 0.1);
    // Frost highlights
    g.fillStyle(COLORS.white, 0.5);
    g.fillCircle(-r * 0.25, -r * 0.25, r * 0.12);
    g.fillStyle(COLORS.ice, 0.4);
    g.fillCircle(r * 0.25, r * 0.05, r * 0.18);
  }

  private detailMagma(g: Phaser.GameObjects.Graphics, r: number): void {
    // Glowing lava cracks
    g.fillStyle(0x2a0e08, 0.6);
    g.fillCircle(0, 0, r * 0.7);
    g.lineStyle(3, COLORS.magma, 1);
    g.lineBetween(-r * 0.5, -r * 0.2, 0, r * 0.1);
    g.lineBetween(0, r * 0.1, r * 0.45, -r * 0.05);
    g.lineBetween(0, r * 0.1, -r * 0.1, r * 0.5);
    g.lineStyle(1.5, COLORS.gold, 0.9);
    g.lineBetween(-r * 0.5, -r * 0.2, 0, r * 0.1);
    // Molten glow spots
    g.fillStyle(COLORS.magma, 0.9);
    g.fillCircle(r * 0.2, -r * 0.2, r * 0.1);
    g.fillCircle(-r * 0.3, r * 0.25, r * 0.08);
  }

  private toPts(flat: number[]): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  // -- Radar preview of contents ---------------------------------------
  private maybeShowRadar(): void {
    const radar = GameState.radarLevel();
    if (radar <= 0) return;
    const def = ITEMS[this.contains];
    const c = this.scene.add.container(0, 0);
    // Faint icon glyph in the asteroid centre
    const color = radar >= 2 ? def.color : COLORS.white;
    const txt = this.scene.add.text(0, 0, def.glyph, {
      fontSize: '20px',
      color: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setAlpha(0.55);
    c.add(txt);
    if (radar >= 3) {
      const val = this.scene.add.text(0, 18, `${def.value}`, {
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: '11px',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.6);
      c.add(val);
    }
    this.radarHint = c;
    this.add(c);
  }

  // -- Combat -----------------------------------------------------------
  /** Returns true when this hit cracks the asteroid open. */
  takeDamage(amount: number): boolean {
    if (this.cracked) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.flash();
    this.redrawHpRing();
    if (this.hp <= 0) {
      this.cracked = true;
      return true;
    }
    return false;
  }

  private flash(): void {
    this.art.setAlpha(0.5);
    this.scene.time.delayedCall(60, () => this.art?.setAlpha(1));
  }

  private redrawHpRing(): void {
    const g = this.hpRing;
    g.clear();
    if (this.hp >= this.maxHp) return;
    const ratio = this.hp / this.maxHp;
    g.lineStyle(3, COLORS.magma, 0.25);
    g.strokeCircle(0, 0, this.radius + 8);
    g.lineStyle(3, this.hp / this.maxHp > 0.4 ? COLORS.cyan : COLORS.magma, 0.9);
    g.beginPath();
    g.arc(0, 0, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    g.strokePath();
  }

  // -- Movement ---------------------------------------------------------
  update(scrollSpeed: number, dt: number): void {
    this.y += scrollSpeed * dt;
    this.art.rotation += this.spinSpeed * dt;
    if (this.radarHint) this.radarHint.rotation = -this.art.rotation; // keep hint upright
    this.hpRing.rotation += this.spinSpeed * dt;
  }

  /** The vertices (world-relative) for fragment spawning. */
  getVertices(): number[] { return this.vertices; }
}

export default Asteroid;
