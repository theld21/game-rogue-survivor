import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, ITEMS, ItemKind } from '../config.ts';

// =====================================================================
// Item.ts — Harvestable treasure released when an asteroid shatters.
//
// Each kind has bespoke vector art + a GSAP shimmer. Items drift down
// with the world until grabbed by the claw; while hauled they follow the
// claw head. `weight` controls how slowly the claw retracts.
// =====================================================================

export type ItemState = 'free' | 'grabbed' | 'collected';

export class Item extends Phaser.GameObjects.Container {
  kind: ItemKind;
  weight: number;
  value: number;
  rarity: string;
  hazard?: 'bomb' | 'frost';
  state: ItemState = 'free';

  private art!: Phaser.GameObjects.Graphics;
  private shimmer?: gsap.core.Tween;
  private warnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: ItemKind) {
    super(scene, x, y);
    const def = ITEMS[kind];
    this.kind = kind;
    this.weight = def.weight;
    this.value = def.value;
    this.rarity = def.rarity;
    this.hazard = def.hazard;
    scene.add.existing(this);
    this.setDepth(22);

    this.buildArt();
    this.spawnPop();
  }

  private buildArt(): void {
    const g = this.scene.add.graphics();
    const def = ITEMS[this.kind];

    // Shared glow halo
    g.fillStyle(def.color, 0.14);
    g.fillCircle(0, 0, 26);

    switch (this.kind) {
      case 'quartz': this.drawQuartz(g); break;
      case 'gold':   this.drawGold(g); break;
      case 'core':   this.drawCore(g); break;
      case 'relic':  this.drawRelic(g); break;
      case 'bomb':   this.drawBomb(g); break;
      case 'frost':  this.drawFrost(g); break;
    }
    this.art = g;
    this.add(g);

    // Hazards pulse a warning halo so the player can avoid hauling them
    if (this.hazard) {
      const warn = this.scene.add.graphics();
      warn.lineStyle(2, this.hazard === 'bomb' ? COLORS.magma : COLORS.ice, 0.8);
      warn.strokeCircle(0, 0, 22);
      this.addAt(warn, 0);
      // Keep the ref so we can kill it on destroy — a repeat:-1 tween left
      // targeting a destroyed graphic never completes and leaks otherwise.
      this.warnTween = this.scene.tweens.add({
        targets: warn, alpha: 0.1, scaleX: 1.3, scaleY: 1.3,
        duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // GSAP shimmer — alpha + scale pulse (frame-independent, smooth at 120Hz)
    this.shimmer = gsap.to(this.art, {
      duration: 0.7 + Math.random() * 0.4,
      alpha: 0.65,
      scaleX: 1.12,
      scaleY: 1.12,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  private drawQuartz(g: Phaser.GameObjects.Graphics): void {
    // Faceted crystal — sharp diamond with inner facets
    const pts = [0, -16, 10, -4, 7, 14, -7, 14, -10, -4];
    g.fillStyle(COLORS.ice, 0.9);
    g.fillPoints(this.toPts(pts), true);
    g.lineStyle(2, COLORS.white, 0.95);
    g.strokePoints(this.toPts(pts), true);
    // Inner facet lines
    g.lineStyle(1, COLORS.white, 0.6);
    g.lineBetween(0, -16, 0, 14);
    g.lineBetween(-10, -4, 7, 14);
    g.lineBetween(10, -4, -7, 14);
    // Sparkle
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(-3, -6, 1.6);
  }

  private drawGold(g: Phaser.GameObjects.Graphics): void {
    // Chunky angular nugget with shaded facets
    g.fillStyle(COLORS.gold, 1);
    g.fillRoundedRect(-13, -10, 26, 20, 3);
    // Top-lit facet
    g.fillStyle(0xffe07a, 1);
    g.fillTriangle(-13, -10, 13, -10, -2, 0);
    // Shadow facet
    g.fillStyle(0xc88a18, 1);
    g.fillTriangle(-13, 10, 13, 10, 8, 0);
    g.lineStyle(2, 0xfff0b0, 0.9);
    g.strokeRoundedRect(-13, -10, 26, 20, 3);
    // Glints
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(-6, -4, 1.8);
    g.fillCircle(5, 2, 1.2);
  }

  private drawCore(g: Phaser.GameObjects.Graphics): void {
    // Plasma sphere with orbiting electric arcs
    g.fillStyle(COLORS.cyan, 0.35);
    g.fillCircle(0, 0, 15);
    g.fillStyle(COLORS.white, 0.9);
    g.fillCircle(0, 0, 8);
    g.fillStyle(COLORS.cyan, 1);
    g.fillCircle(0, 0, 5);
    g.lineStyle(2, COLORS.cyan, 0.9);
    g.strokeCircle(0, 0, 15);
    // Electric arcs (zig-zag spokes)
    g.lineStyle(1.5, COLORS.white, 0.8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x1 = Math.cos(a) * 15, y1 = Math.sin(a) * 15;
      const x2 = Math.cos(a + 0.3) * 22, y2 = Math.sin(a + 0.3) * 22;
      g.lineBetween(x1, y1, x2, y2);
    }
  }

  private drawRelic(g: Phaser.GameObjects.Graphics): void {
    // Ancient ornate artifact — hexagonal medallion with rune
    const hex: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      hex.push(Math.cos(a) * 16, Math.sin(a) * 16);
    }
    g.fillStyle(COLORS.purple, 0.9);
    g.fillPoints(this.toPts(hex), true);
    g.lineStyle(2.5, COLORS.pink, 1);
    g.strokePoints(this.toPts(hex), true);
    // Inner ring
    g.lineStyle(1.5, COLORS.gold, 0.9);
    g.strokeCircle(0, 0, 9);
    // Rune mark
    g.lineStyle(2, COLORS.gold, 1);
    g.lineBetween(0, -7, 0, 7);
    g.lineBetween(-5, -2, 5, -2);
    g.lineBetween(-4, 4, 4, 4);
  }

  private drawBomb(g: Phaser.GameObjects.Graphics): void {
    // Volatile mine — dark sphere, red core, spikes, lit fuse
    g.fillStyle(0x2a1010, 1);
    g.fillCircle(0, 2, 14);
    g.lineStyle(2, COLORS.magma, 1);
    g.strokeCircle(0, 2, 14);
    // Spikes
    g.lineStyle(3, 0x3a1818, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 13, 2 + Math.sin(a) * 13, Math.cos(a) * 19, 2 + Math.sin(a) * 19);
    }
    // Pulsing core
    g.fillStyle(COLORS.magma, 1);
    g.fillCircle(0, 2, 6);
    g.fillStyle(COLORS.gold, 0.9);
    g.fillCircle(0, 2, 3);
    // Fuse + spark
    g.lineStyle(2, 0x9a8050, 1);
    g.lineBetween(0, -12, 4, -18);
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(4, -18, 2.5);
  }

  private drawFrost(g: Phaser.GameObjects.Graphics): void {
    // Cryo shard — six-point ice star
    g.lineStyle(3, COLORS.ice, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ex = Math.cos(a) * 16, ey = Math.sin(a) * 16;
      g.lineBetween(0, 0, ex, ey);
      // little branches
      const bx = Math.cos(a) * 10, by = Math.sin(a) * 10;
      g.lineBetween(bx, by, bx + Math.cos(a + 0.5) * 5, by + Math.sin(a + 0.5) * 5);
      g.lineBetween(bx, by, bx + Math.cos(a - 0.5) * 5, by + Math.sin(a - 0.5) * 5);
    }
    g.fillStyle(COLORS.white, 0.95);
    g.fillCircle(0, 0, 4);
    g.lineStyle(2, COLORS.white, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.lineBetween(0, 0, Math.cos(a) * 8, Math.sin(a) * 8);
    }
  }

  private toPts(flat: number[]): Phaser.Geom.Point[] {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < flat.length; i += 2) pts.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return pts;
  }

  private spawnPop(): void {
    this.setScale(0.2);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1, scaleY: 1,
      duration: 280,
      ease: 'Back.out',
    });
  }

  /** Called by the claw when it grabs this item. */
  grab(): void {
    if (this.state !== 'free') return;
    this.state = 'grabbed';
    this.setDepth(33);
  }

  /** Drift with the world scroll while free. */
  drift(scrollSpeed: number, dt: number): void {
    if (this.state === 'free') {
      this.y += scrollSpeed * dt;
    }
  }

  collect(): void {
    this.state = 'collected';
    this.shimmer?.kill();
    this.warnTween?.stop();
    this.scene.tweens.add({
      targets: this,
      scaleX: 0, scaleY: 0,
      alpha: 0,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    this.shimmer?.kill();
    this.warnTween?.stop();
    super.destroy(fromScene);
  }
}

export default Item;
