import Phaser from 'phaser';
import { COLORS, ELEMENTS } from '../config.ts';
import { IslandData } from '../data/World.ts';

// =====================================================================
// Island.ts — a floating planet. Art varies by ROLE: mother (delivery
// target), resource (element-coloured), heal, storm, forge. Static
// collision core (enabled only when near — see World cull).
// =====================================================================

export class Island extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.StaticBody;
  info: IslandData;
  culled = false;
  private tierGfx?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: IslandData) {
    super(scene, data.x, data.y);
    this.info = data;
    scene.add.existing(this);
    this.setDepth(20);
    this.buildArt();
    scene.physics.add.existing(this, true);
    const core = data.radius * 0.82;
    this.body.setCircle(core);
    this.body.setOffset(-core, -core);
  }

  /** Tint colour for this planet (used by auras / minimap). */
  tint(): number {
    const d = this.info;
    if (d.role === 'mother') return COLORS.gold;
    if (d.role === 'resource') return ELEMENTS[d.element!].color;
    if (d.role === 'heal') return COLORS.heal;
    if (d.role === 'storm') return COLORS.amber;   // orange-gold electric
    return 0xff9d3c; // forge
  }

  private blob(g: Phaser.GameObjects.Graphics, r: number, fill: number, line: number, jitter: number): void {
    const pts: Phaser.Geom.Point[] = []; const seg = 14;
    let s = (this.info.id + 3) * 2654435761 % 1000;
    const rnd = () => { s = (s * 16807 + 1) % 2147483647; return (s % 1000) / 1000; };
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; const rr = r * (1 - jitter + rnd() * jitter * 2); pts.push(new Phaser.Geom.Point(Math.cos(a) * rr, Math.sin(a) * rr)); }
    g.fillStyle(fill, 1); g.fillPoints(pts, true);
    g.lineStyle(3, line, 0.9); g.strokePoints(pts, true, true);
  }
  private shade(c: number, amt: number): number {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    return (Math.round(r * (1 + amt)) << 16) | (Math.round(g * (1 + amt)) << 8) | Math.round(b * (1 + amt));
  }

  private buildArt(): void {
    const r = this.info.radius; const col = this.tint();
    const aura = this.scene.add.graphics();
    aura.fillStyle(col, 0.08); aura.fillCircle(0, 0, r * 1.35);
    this.add(aura);

    const g = this.scene.add.graphics();
    this.blob(g, r * 1.02, 0x1a2240, 0x0d1430, 0.16);
    this.blob(g, r * 0.86, this.shade(col, -0.55), this.shade(col, -0.25), 0.12);
    this.add(g);

    const f = this.scene.add.graphics();
    switch (this.info.role) {
      case 'mother': this.drawMother(f, r); break;
      case 'resource': this.drawResource(f, r, col); break;
      case 'heal': this.drawHeal(f, r); break;
      case 'storm': this.drawStorm(f, r); break;
      case 'forge': this.drawForge(f, r); break;
    }
    this.add(f);

    const label = this.scene.add.text(0, -r - 18, this.info.name, {
      fontFamily: 'Rajdhani, sans-serif', fontSize: '17px', color: '#dfe9ff', stroke: '#0a1228', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22);
    this.add(label);
  }

  private drawMother(g: Phaser.GameObjects.Graphics, r: number): void {
    g.lineStyle(5, COLORS.gold, 0.9); g.strokeCircle(0, 0, r * 0.62);
    g.lineStyle(2, COLORS.gold, 0.5); g.strokeCircle(0, 0, r * 0.8);
    g.lineStyle(1.5, COLORS.gold, 0.3); g.strokeCircle(0, 0, r * 0.46);
    // four anchor pylons
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.lineStyle(4, COLORS.gold, 0.8); g.lineBetween(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); }
    // 10 element sockets around the rim
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.fillStyle(COLORS.gold, 0.85); g.fillCircle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 5); g.fillStyle(COLORS.white, 0.5); g.fillCircle(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 2); }
    // glowing core
    g.fillStyle(0x5a4a2a, 1); g.fillCircle(0, 0, r * 0.34);
    g.fillStyle(COLORS.gold, 0.25); g.fillCircle(0, 0, r * 0.27);
    g.fillStyle(COLORS.aetherHot, 0.95); g.fillCircle(0, 0, r * 0.16);
    g.fillStyle(COLORS.white, 0.85); g.fillCircle(-r * 0.05, -r * 0.05, r * 0.06);
    // tier-evolution overlay (rings light up as the Mother levels)
    this.tierGfx = this.scene.add.graphics(); this.add(this.tierGfx); this.setMotherLevel(0);
  }

  /** Light up `n` evolution rings around the Mother (tier 0..3). */
  setMotherLevel(n: number): void {
    if (!this.tierGfx) return;
    const g = this.tierGfx; g.clear(); const r = this.info.radius;
    if (n > 0) { g.fillStyle(COLORS.aetherHot, 0.05 * n); g.fillCircle(0, 0, r * 0.95); }
    for (let k = 0; k < n; k++) { g.lineStyle(3, COLORS.aetherHot, 0.55); g.strokeCircle(0, 0, r * (0.88 + k * 0.08)); }
  }
  private drawResource(g: Phaser.GameObjects.Graphics, r: number, col: number): void {
    // a glowing element crystal cluster
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, d = r * 0.35;
      const x = Math.cos(a) * d, y = Math.sin(a) * d, s = r * 0.28;
      g.fillStyle(col, 0.95); g.fillTriangle(x, y - s, x - s * 0.5, y + s * 0.5, x + s * 0.5, y + s * 0.5);
      g.lineStyle(1.5, COLORS.white, 0.6); g.strokeTriangle(x, y - s, x - s * 0.5, y + s * 0.5, x + s * 0.5, y + s * 0.5);
    }
    g.fillStyle(col, 1); g.fillCircle(0, 0, r * 0.16);
  }
  private drawHeal(g: Phaser.GameObjects.Graphics, r: number): void {
    g.fillStyle(COLORS.heal, 0.9); g.fillRoundedRect(-r * 0.1, -r * 0.42, r * 0.2, r * 0.84, 4); g.fillRoundedRect(-r * 0.42, -r * 0.1, r * 0.84, r * 0.2, 4);
    g.lineStyle(3, COLORS.heal, 0.6); g.strokeCircle(0, 0, r * 0.55);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(COLORS.heal, 0.7); g.fillCircle(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 4); }
  }
  private drawStorm(g: Phaser.GameObjects.Graphics, r: number): void {
    // Same layout as the heal planet, but a lightning bolt instead of the plus (amber/orange).
    const c = COLORS.amber;
    const bolt = [
      new Phaser.Geom.Point(r * 0.1, -r * 0.5), new Phaser.Geom.Point(-r * 0.24, -r * 0.02),
      new Phaser.Geom.Point(-r * 0.02, -r * 0.02), new Phaser.Geom.Point(-r * 0.1, r * 0.5),
      new Phaser.Geom.Point(r * 0.28, -r * 0.06), new Phaser.Geom.Point(r * 0.05, -r * 0.06),
    ];
    g.fillStyle(c, 0.95); g.fillPoints(bolt, true);
    g.lineStyle(1.5, COLORS.white, 0.6); g.strokePoints(bolt, true, true);
    g.lineStyle(3, c, 0.6); g.strokeCircle(0, 0, r * 0.55);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(c, 0.7); g.fillCircle(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, 4); }
  }
  private drawForge(g: Phaser.GameObjects.Graphics, r: number): void {
    g.lineStyle(5, COLORS.amber, 0.9); g.strokeCircle(0, 0, r * 0.34);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(5, COLORS.amber, 0.9); g.lineBetween(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); }
    g.fillStyle(0x3a2a14, 1); g.fillCircle(0, 0, r * 0.2); g.fillStyle(COLORS.amber, 0.9); g.fillCircle(0, 0, r * 0.08);
  }

  /** Effect radius for proximity planets (heal / storm). */
  proximity(mult: number): number { return this.info.radius * mult; }

  setCulled(off: boolean): void {
    if (this.culled === off) return;
    this.culled = off;
    this.setVisible(!off);
    if (this.body) this.body.enable = !off;
  }
}
export default Island;
