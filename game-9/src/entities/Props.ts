import Phaser from 'phaser';
import { COLORS, RESOURCES, ResourceKind } from '../config.ts';
import { RockDef, NodeDef, VentDef, DecorDef, LooseDef } from '../data/WorldGen.ts';

// =====================================================================
// Props.ts — lightweight culled world objects: Rock (obstacle, manual
// distance collision), ResourceNode (mineable, regrows), Vent (hazard +
// bubbles), Decor (swaying kelp / coral). Each toggles visibility offscreen.
// =====================================================================

abstract class Prop extends Phaser.GameObjects.Container {
  culled = false;
  setCulled(off: boolean): void { if (this.culled === off) return; this.culled = off; this.setVisible(!off); this.setActive(!off); }
}

export class Rock extends Prop {
  r: number;
  constructor(scene: Phaser.Scene, d: RockDef) {
    super(scene, d.x, d.y); this.r = d.r; scene.add.existing(this); this.setDepth(18);
    const g = scene.add.graphics(); const r = d.r;
    let s = d.seed % 100000; const rnd = () => { s = (s * 16807 + 1) % 2147483647; return (s % 1000) / 1000; };
    const pts: Phaser.Geom.Point[] = []; const seg = 12;
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; const rr = r * (0.78 + rnd() * 0.34); pts.push(new Phaser.Geom.Point(Math.cos(a) * rr, Math.sin(a) * rr)); }
    g.fillStyle(0x16222e, 1); g.fillPoints(pts, true);
    g.lineStyle(2.5, 0x0a1018, 1); g.strokePoints(pts, true, true);
    g.fillStyle(0x223240, 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x * 0.7, p.y * 0.7 - r * 0.12)), true);
    for (let i = 0; i < 4; i++) { g.fillStyle(0x35506a, 0.7); g.fillCircle((rnd() - 0.5) * r, (rnd() - 0.5) * r, 2 + rnd() * 3); }
    this.add(g);
  }
}

export class ResourceNode extends Prop {
  kind: ResourceKind; amount: number; private glowGfx?: Phaser.GameObjects.Graphics; depleted = false;
  constructor(scene: Phaser.Scene, d: NodeDef) {
    super(scene, d.x, d.y); this.kind = d.kind; this.amount = 3 + Math.floor(Math.random() * 4);
    scene.add.existing(this); this.setDepth(22);
    const meta = RESOURCES[d.kind]; const c = meta.color;
    if (meta.glows) { this.glowGfx = scene.add.graphics(); this.glowGfx.fillStyle(c, 0.16); this.glowGfx.fillCircle(0, 0, 26); this.add(this.glowGfx); }
    const g = scene.add.graphics();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const x = Math.cos(a) * 7, y = Math.sin(a) * 7; g.fillStyle(c, 0.95); g.fillTriangle(x, y - 9, x - 5, y + 5, x + 5, y + 5); g.lineStyle(1, COLORS.white, 0.5); g.strokeTriangle(x, y - 9, x - 5, y + 5, x + 5, y + 5); }
    g.fillStyle(c, 1); g.fillCircle(0, 0, 5);
    this.add(g);
  }
  harvest(): boolean {
    if (this.amount <= 0) return false;
    this.amount--;
    // schedule its own regrow (cull-independent — a scene timer is cleared on shutdown)
    if (this.amount <= 0) { this.depleted = true; this.setAlpha(0.25); this.scene.time.delayedCall(22000, () => this.regrow()); }
    return true;
  }
  regrow(): void { if (!this.depleted) return; this.amount = 3 + Math.floor(Math.random() * 4); this.depleted = false; this.setAlpha(1); }
}

export class LooseItem extends Prop {
  kind: ResourceKind; alive = true; private baseY: number; private t = Math.random() * 6;
  constructor(scene: Phaser.Scene, d: LooseDef) {
    super(scene, d.x, d.y); this.kind = d.kind; this.baseY = d.y; scene.add.existing(this); this.setDepth(23);
    const c = RESOURCES[d.kind].color; const g = scene.add.graphics();
    g.fillStyle(c, 0.18); g.fillCircle(0, 0, 22);
    if (d.kind === 'salvage') { g.fillStyle(0x4a3a22, 1); g.fillRoundedRect(-11, -8, 22, 16, 3); g.lineStyle(2, c, 0.9); g.strokeRoundedRect(-11, -8, 22, 16, 3); g.fillStyle(c, 0.9); g.fillRect(-2, -8, 4, 16); }
    else { g.fillStyle(c, 1); g.fillCircle(0, 0, 8); g.fillStyle(COLORS.white, 0.7); g.fillCircle(-2.5, -2.5, 3); g.lineStyle(1.5, c, 0.7); g.strokeCircle(0, 0, 12); }
    this.add(g);
  }
  bob(dt: number): void { this.t += dt; this.y = this.baseY + Math.sin(this.t * 1.5) * 6; this.rotation = Math.sin(this.t) * 0.2; }
  grab(): void { this.alive = false; this.setVisible(false); this.setActive(false); }
}

export class Vent extends Prop {
  private glow!: Phaser.GameObjects.Graphics; private t = 0;
  constructor(scene: Phaser.Scene, d: VentDef) {
    super(scene, d.x, d.y); scene.add.existing(this); this.setDepth(19);
    const g = scene.add.graphics();
    g.fillStyle(0x1a1014, 1); g.fillTriangle(-22, 0, 22, 0, 6, -40); g.fillTriangle(-22, 0, 6, -40, -10, -38);
    g.lineStyle(2, 0x3a2418, 1); g.strokeTriangle(-22, 0, 22, 0, 6, -40);
    this.add(g);
    this.glow = scene.add.graphics(); this.add(this.glow);
  }
  pulse(dt: number): void { this.t += dt; this.glow.clear(); const f = 0.5 + Math.sin(this.t * 4) * 0.5; this.glow.fillStyle(COLORS.vent, 0.3 + f * 0.4); this.glow.fillCircle(2, -40, 8 + f * 4); this.glow.fillStyle(COLORS.warn, 0.4); this.glow.fillCircle(2, -40, 4); }
}

export class Decor extends Prop {
  private blades: Phaser.GameObjects.Graphics; private t = Math.random() * 6; private kind: 'kelp' | 'coral'; private h: number;
  constructor(scene: Phaser.Scene, d: DecorDef) {
    super(scene, d.x, d.y); this.kind = d.kind; this.h = d.h; scene.add.existing(this); this.setDepth(16);
    this.blades = scene.add.graphics(); this.add(this.blades); this.redraw(0);
  }
  private redraw(sway: number): void {
    const g = this.blades; g.clear();
    if (this.kind === 'kelp') {
      for (let s = -1; s <= 1; s++) { g.lineStyle(5, COLORS.kelp, 0.8); g.beginPath(); g.moveTo(s * 8, 0); for (let i = 1; i <= 4; i++) { const yy = -this.h * i / 4; g.lineTo(s * 8 + Math.sin(this.t + i) * sway * i, yy); } g.strokePath(); }
    } else {
      g.fillStyle(COLORS.coral, 0.85); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.4; g.fillCircle(Math.cos(a) * this.h * 0.6, -Math.abs(Math.sin(a)) * this.h, 4); g.lineStyle(3, COLORS.coral, 0.7); g.lineBetween(0, 0, Math.cos(a) * this.h * 0.6, -Math.abs(Math.sin(a)) * this.h); }
    }
  }
  sway(dt: number): void { if (this.kind !== 'kelp') return; this.t += dt; this.redraw(4); }
}
